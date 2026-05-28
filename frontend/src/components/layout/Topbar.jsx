import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, RefreshCw, Loader2, LogOut, Eye, User } from 'lucide-react'
import { useMarketStore } from '@/store/marketStore'
import { useAlertsStore } from '@/store/alertsStore'
import { useAuthStore } from '@/store/authStore'
import { marketService } from '@/services/marketService'
import { formatPct, fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

const INDICES = [
  { key: 'sp500',  label: 'S&P 500' },
  { key: 'nasdaq', label: 'NASDAQ'  },
  { key: 'btc',    label: 'BTC'     },
]

function SearchBar() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [quotes, setQuotes]     = useState({})
  const [searching, setSearching] = useState(false)
  const [open, setOpen]         = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef  = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapperRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await marketService.search(query)
        const filtered = res.filter(r => r.symbol && r.quoteType).slice(0, 6)
        setResults(filtered)
        setOpen(filtered.length > 0)
        // Fetch live prices for results
        const symbols = filtered.map(r => r.symbol)
        if (symbols.length) {
          const q = await marketService.getWatchlistQuotes(symbols)
          setQuotes(q)
        }
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar activo…"
          className="bg-s2 border border-border text-txt text-sm font-mono pl-8 pr-8 py-1.5 rounded-lg outline-none focus:border-buy/50 transition-colors w-48 placeholder:text-muted"
        />
        {searching && (
          <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.map(r => {
            const q = quotes[r.symbol]
            return (
              <div
                key={r.symbol}
                className="flex items-center gap-3 px-4 py-3 hover:bg-s2 cursor-pointer transition-colors"
                onClick={() => { setQuery(''); setOpen(false) }}
              >
                <div className="w-8 h-8 rounded-lg bg-s2 flex items-center justify-center shrink-0">
                  <span className="font-mono text-[0.55rem] text-muted2">{r.symbol.slice(0,3)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-txt font-medium">{r.symbol}</div>
                  <div className="font-mono text-[0.6rem] text-muted truncate">{r.longname ?? r.shortname}</div>
                </div>
                {q && (
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-txt">{fmt.usd(q.price)}</div>
                    <div className={clsx('font-mono text-[0.6rem]', pctClass(q.pct))}>
                      {formatPct(q.pct)}
                    </div>
                  </div>
                )}
                {!q && searching && (
                  <Loader2 size={11} className="text-muted animate-spin shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { user, demo, signOut } = useAuthStore()
  const navigate                = useNavigate()
  const [open, setOpen]         = useState(false)
  const ref                     = useRef(null)

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleExit = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium transition-all ${demo ? 'bg-muted/20 text-muted2' : 'bg-buy/20 text-buy'}`}
      >
        {demo ? <Eye size={13} strokeWidth={1.8} /> : (user?.email?.[0]?.toUpperCase() ?? <User size={13} />)}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="font-mono text-xs text-txt font-medium truncate">
              {demo ? 'Modo Demo' : (user?.email ?? '')}
            </div>
            <div className="font-mono text-[0.6rem] text-muted mt-0.5">
              {demo ? 'Sin cuenta · datos locales' : 'Cuenta activa'}
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); handleExit() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted2 hover:text-sell hover:bg-sell/5 transition-all font-mono"
          >
            <LogOut size={14} strokeWidth={1.8} />
            {demo ? 'Salir del demo' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Topbar() {
  const { indices, lastUpdated, refreshing, refresh } = useMarketStore()
  const { unacknowledged, acknowledgeAll }            = useAlertsStore()
  const navigate = useNavigate()

  const handleBell = () => {
    acknowledgeAll()
    navigate('/alerts')
  }

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 md:gap-4 px-4 md:px-6 border-b border-border bg-surface">
      {/* Logo — mobile only */}
      <span className="font-display font-extrabold text-lg tracking-tight md:hidden shrink-0">
        ORI<span className="text-buy">ON</span>
      </span>

      {/* Mini indices — desktop only */}
      <div className="hidden md:flex items-center gap-4 flex-1">
        {INDICES.map(({ key, label }) => {
          const d = indices?.[key]
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="font-mono text-[0.62rem] text-muted uppercase tracking-wider">{label}</span>
              <span className="font-mono text-xs text-txt">{d?.price ?? '—'}</span>
              {d?.pct !== undefined && (
                <span className={clsx('font-mono text-[0.65rem]', d.pct >= 0 ? 'text-up' : 'text-down')}>
                  {formatPct(d.pct)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex-1 md:flex-none">
        <SearchBar />
      </div>

      {/* Refresh */}
      <button
        onClick={refresh}
        className={clsx('text-muted2 hover:text-buy transition-colors', refreshing && 'animate-spin')}
        title="Actualizar datos"
      >
        <RefreshCw size={15} strokeWidth={1.8} />
      </button>

      {/* Notifications */}
      <button onClick={handleBell} className="relative text-muted2 hover:text-txt transition-colors" title="Alertas">
        <Bell size={16} strokeWidth={1.8} />
        {unacknowledged > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-buy text-bg text-[0.45rem] font-mono font-bold flex items-center justify-center px-0.5">
            {unacknowledged > 9 ? '9+' : unacknowledged}
          </span>
        )}
      </button>

      {lastUpdated && (
        <span className="font-mono text-[0.58rem] text-muted hidden xl:block">
          Act. {lastUpdated}
        </span>
      )}

      {/* User avatar — mobile only */}
      <UserMenu />
    </header>
  )
}
