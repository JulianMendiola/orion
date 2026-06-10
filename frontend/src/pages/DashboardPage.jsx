import { useEffect } from 'react'
import { useMarketStore } from '@/store/marketStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import PortfolioSummary from '@/components/dashboard/PortfolioSummary'
import PositionsList from '@/components/dashboard/PositionsList'
import AllocationChart from '@/components/dashboard/AllocationChart'
import DailyBrief from '@/components/dashboard/DailyBrief'
import QuickSignals from '@/components/dashboard/QuickSignals'
import ArgentinaPanel from '@/components/dashboard/ArgentinaPanel'

export default function DashboardPage() {
  const { refresh, quotes } = useMarketStore()

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted2 text-sm mt-0.5">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Top summary strip */}
      <PortfolioSummary />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Positions — 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-5">
          <PositionsList />
          <QuickSignals />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <ArgentinaPanel />
          <AllocationChart />
          <DailyBrief />
        </div>
      </div>
    </div>
  )
}
