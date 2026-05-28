import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Bitcoin, DollarSign, BarChart2, RefreshCw } from 'lucide-react'
import { Card, SectionLabel, Skeleton } from '@/components/ui'
import { marketService } from '@/services/marketService'
import { fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

const TABS = [
  { id: 'stocks', label: 'Acciones', icon: TrendingUp },
  { id: 'crypto',  label: 'Cripto',   icon: Bitcoin },
  { id: 'forex',   label: 'Forex',    icon: DollarSign },
  { id: 'etfs',    label: 'ETFs',     icon: BarChart2 },
  { id: 'bonds',   label: 'Bonos',    icon: TrendingDown },
]

const STOCK_TICKERS = ['AAPL', 'NVDA', 'META', 'MSFT', 'AMZN', 'TSLA', 'LLY', 'JPM', 'GOOGL', 'NFLX']
const ETF_TICKERS   = ['SPY', 'QQQ', 'VTI', 'GLD', 'AGG', 'IWM', 'EEM', 'TLT']
const CRYPTO_IDS    = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'avalanche-2']
const CRYPTO_META   = {
  bitcoin:       { ticker: 'BTC',  name: 'Bitcoin',   sector: 'PoW' },
  ethereum:      { ticker: 'ETH',  name: 'Ethereum',  sector: 'Smart Contracts' },
  solana:        { ticker: 'SOL',  name: 'Solana',    sector: 'Layer 1' },
  binancecoin:   { ticker: 'BNB',  name: 'BNB',       sector: 'Exchange' },
  ripple:        { ticker: 'XRP',  name: 'Ripple',    sector: 'Pagos' },
  cardano:       { ticker: 'ADA',  name: 'Cardano',   sector: 'Layer 1' },
  'avalanche-2': { ticker: 'AVAX', name: 'Avalanche', sector: 'Layer 1' },
}
const FOREX_PAIRS = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDARS=X', 'USDBRL=X', 'USDCAD=X']
const FOREX_LABELS = {
  'EURUSD=X': { name: 'Euro / Dólar',       sector: 'Mayor' },
  'GBPUSD=X': { name: 'Libra / Dólar',      sector: 'Mayor' },
  'USDJPY=X': { name: 'Dólar / Yen',        sector: 'Mayor' },
  'USDARS=X': { name: 'Dólar / Peso Arg.',  sector: 'Emergente' },
  'USDBRL=X': { name: 'Dólar / Real',       sector: 'Emergente' },
  'USDCAD=X': { name: 'Dólar / CAD',        sector: 'Mayor' },
}
const BONDS_MOCK = [
  { ticker: 'US10Y', name: 'Bono EEUU 10 años',  price: 4.42,  pct: -0.05, mktCap: '—', sector: 'Soberano' },
  { ticker: 'US2Y',  name: 'Bono EEUU 2 años',   price: 4.81,  pct:  0.02, mktCap: '—', sector: 'Soberano' },
  { ticker: 'US30Y', name: 'Bono EEUU 30 años',  price: 4.88,  pct: -0.03, mktCap: '—', sector: 'Soberano' },
  { ticker: 'TLT',   name: 'iShares 20Y+ Bond',  price: 87.20, pct:  0.55, mktCap: '42B', sector: 'ETF Bonos' },
]

function formatMktCap(n) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n}`
}

async function fetchTab(tab) {
  if (tab === 'stocks') {
    const quotes = await marketService.getWatchlistQuotes(STOCK_TICKERS)
    return STOCK_TICKERS.map(t => quotes[t]).filter(Boolean).map(q => ({
      ticker: q.ticker, name: q.ticker, price: q.price, pct: q.pct,
      mktCap: formatMktCap(q.mktCap), sector: '—',
    }))
  }
  if (tab === 'etfs') {
    const quotes = await marketService.getWatchlistQuotes(ETF_TICKERS)
    return ETF_TICKERS.map(t => quotes[t]).filter(Boolean).map(q => ({
      ticker: q.ticker, name: q.ticker, price: q.price, pct: q.pct,
      mktCap: formatMktCap(q.mktCap), sector: '—',
    }))
  }
  if (tab === 'crypto') {
    const raw = await marketService.getCryptoPrices(CRYPTO_IDS)
    return CRYPTO_IDS
      .filter(id => raw[id])
      .map(id => ({
        ticker: CRYPTO_META[id]?.ticker ?? id.slice(0, 4).toUpperCase(),
        name:   CRYPTO_META[id]?.name ?? id,
        price:  raw[id].usd,
        pct:    raw[id].usd_24h_change,
        mktCap: '—',
        sector: CRYPTO_META[id]?.sector ?? '—',
      }))
  }
  if (tab === 'forex') {
    const raw = await marketService.getForex(FOREX_PAIRS)
    return FOREX_PAIRS
      .filter(p => raw[p])
      .map(p => ({
        ticker: p.replace('=X', ''),
        name:   FOREX_LABELS[p]?.name ?? p,
        price:  raw[p].price,
        pct:    raw[p].pct,
        mktCap: '—',
        sector: FOREX_LABELS[p]?.sector ?? '—',
        isForex: true,
      }))
  }
  if (tab === 'bonds') return BONDS_MOCK
  return []
}

export default function MarketsPage() {
  const [tab, setTab]     = useState('stocks')
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)
  const [ts, setTs]       = useState(null)

  const load = useCallback(async (t) => {
    setLoading(true)
    try {
      const rows = await fetchTab(t)
      setData(rows)
      setTs(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
    } catch {
      setData([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Mercados</h1>
          <p className="text-muted2 text-sm mt-0.5">
            Precios en tiempo real
            {ts && <span className="text-muted"> · Act. {ts}</span>}
          </p>
        </div>
        <button
          onClick={() => load(tab)}
          disabled={loading}
          className="text-muted2 hover:text-buy transition-colors disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw size={15} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1 p-1 bg-s2 rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap',
                tab === id ? 'bg-surface text-txt shadow-sm' : 'text-muted2 hover:text-txt'
              )}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-muted">Activo</th>
                <th className="text-right px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-muted">Precio</th>
                <th className="text-right px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-muted">Cambio 24h</th>
                <th className="text-right px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-muted hidden lg:table-cell">Mkt Cap</th>
                <th className="text-right px-5 py-3 font-mono text-[0.6rem] uppercase tracking-wider text-muted hidden xl:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 7 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-5 py-3.5"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-5 py-3.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right hidden lg:table-cell"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="px-5 py-3.5 text-right hidden xl:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></td>
                </tr>
              ))}

              {!loading && data.map((row) => (
                <tr key={row.ticker} className="border-b border-border/50 hover:bg-s2 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-s3 flex items-center justify-center shrink-0">
                        <span className="font-mono text-[0.6rem] font-medium text-muted2">{row.ticker.slice(0,3)}</span>
                      </div>
                      <div>
                        <div className="font-mono text-sm text-txt font-medium">{row.ticker}</div>
                        <div className="font-mono text-[0.6rem] text-muted">{row.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-sm text-txt">
                    {tab === 'bonds' && !row.isForex ? `${row.price}%` : fmt.usd(row.price)}
                  </td>
                  <td className={clsx('px-5 py-3.5 text-right font-mono text-sm font-medium', pctClass(row.pct))}>
                    {fmt.pct(row.pct)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs text-muted2 hidden lg:table-cell">{row.mktCap}</td>
                  <td className="px-5 py-3.5 text-right hidden xl:table-cell">
                    <span className="font-mono text-[0.6rem] text-muted2 bg-s2 px-2 py-1 rounded-lg">{row.sector}</span>
                  </td>
                </tr>
              ))}

              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center font-mono text-xs text-muted">
                    No se pudieron cargar los datos. Verificá que el backend esté corriendo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
