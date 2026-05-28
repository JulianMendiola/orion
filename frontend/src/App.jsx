import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DashboardPage from '@/pages/DashboardPage'
import MarketsPage from '@/pages/MarketsPage'
import PortfolioPage from '@/pages/PortfolioPage'
import SignalsPage from '@/pages/SignalsPage'
import NewsPage from '@/pages/NewsPage'
import AlertsPage from '@/pages/AlertsPage'
import BacktestPage from '@/pages/BacktestPage'
import LoginPage from '@/pages/LoginPage'
import { useAuthStore } from '@/store/authStore'
import { useMarketStore } from '@/store/marketStore'
import { useAlertsStore } from '@/store/alertsStore'
import { signalsService } from '@/services/signalsService'
import { fireNotification } from '@/utils/notifications'

function ProtectedRoute({ children }) {
  const { user, demo, loading } = useAuthStore()
  // While Supabase session is loading, don't redirect yet
  if (loading) return null
  // Allow access if logged in OR in demo mode
  if (!user && !demo) return <Navigate to="/login" replace />
  return children
}

const RSI_CHECK_EVERY = 5 * 60 * 1000  // verificar RSI cada 5 min

export default function App() {
  const alertIntervalRef = useRef(null)
  const lastRsiCheckRef  = useRef(0)

  useEffect(() => {
    useMarketStore.getState().refresh()
    useAuthStore.getState().init()

    const checkAlerts = async () => {
      const { alerts, triggerAlert } = useAlertsStore.getState()
      const { quotes, refresh }      = useMarketStore.getState()

      refresh()

      // ── Alertas de precio y % del día (instantáneo, usa quotes cacheados)
      alerts.forEach(alert => {
        if (alert.triggered) return
        const quote = quotes[alert.ticker]
        if (!quote?.price) return
        const { price, pct } = quote

        let fired = false
        if (alert.type === 'above'     && price >= alert.targetPrice)  fired = true
        if (alert.type === 'below'     && price <= alert.targetPrice)  fired = true
        if (alert.type === 'pct_above' && typeof pct === 'number' && pct >=  alert.threshold) fired = true
        if (alert.type === 'pct_below' && typeof pct === 'number' && pct <= -alert.threshold) fired = true

        if (fired) {
          triggerAlert(alert.id)
          const displayVal = (alert.type === 'pct_above' || alert.type === 'pct_below') ? pct : price
          fireNotification(alert, displayVal)
        }
      })

      // ── Alertas RSI (requiere llamada al backend — se verifica cada 5 min)
      const now = Date.now()
      if (now - lastRsiCheckRef.current < RSI_CHECK_EVERY) return
      lastRsiCheckRef.current = now

      const rsiAlerts  = alerts.filter(a => !a.triggered && (a.type === 'rsi_above' || a.type === 'rsi_below'))
      const rsiTickers = [...new Set(rsiAlerts.map(a => a.ticker))]
      for (const ticker of rsiTickers) {
        try {
          const tech = await signalsService.quickTechnical(ticker)
          if (tech.rsi == null) continue
          rsiAlerts.filter(a => a.ticker === ticker).forEach(alert => {
            let fired = false
            if (alert.type === 'rsi_above' && tech.rsi >= alert.threshold) fired = true
            if (alert.type === 'rsi_below' && tech.rsi <= alert.threshold) fired = true
            if (fired) {
              triggerAlert(alert.id)
              fireNotification(alert, tech.rsi)
            }
          })
        } catch {}
      }
    }

    alertIntervalRef.current = setInterval(checkAlerts, 30_000)
    return () => clearInterval(alertIntervalRef.current)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="markets"    element={<MarketsPage />} />
        <Route path="portfolio"  element={<PortfolioPage />} />
        <Route path="signals"    element={<SignalsPage />} />
        <Route path="news"       element={<NewsPage />} />
        <Route path="alerts"     element={<AlertsPage />} />
        <Route path="backtest"   element={<BacktestPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
