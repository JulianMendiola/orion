import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { usePortfolioStore } from '@/store/portfolioStore'
import { marketService } from '@/services/marketService'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const COLORS = ['#4f8cff', '#00e5a0', '#c084fc', '#f97316', '#facc15', '#f43f5e', '#38bdf8', '#a3e635']
const TYPES  = ['stock', 'crypto', 'etf', 'bond', 'forex']

const BLANK = {
  ticker:     '',
  name:       '',
  type:       'stock',
  shares:     '',
  entryPrice: '',
  entryDate:  new Date().toISOString().split('T')[0],
  sector:     '',
  color:      COLORS[0],
}

export default function AddPositionModal({ onClose }) {
  const addPosition = usePortfolioStore(s => s.addPosition)
  const [form, setForm]         = useState(BLANK)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [loading, setLoading]   = useState(false)
  const debounceRef = useRef(null)

  // Debounced ticker search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await marketService.search(query)
        setResults(res.filter(r => r.quoteType && r.symbol))
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const selectResult = async (r) => {
    setQuery('')
    setResults([])
    setFetchingPrice(true)
    try {
      const quotes = await marketService.getWatchlistQuotes([r.symbol])
      const price  = quotes[r.symbol]?.price ?? ''
      setForm(f => ({
        ...f,
        ticker:     r.symbol,
        name:       r.longname ?? r.shortname ?? r.symbol,
        entryPrice: price,
        type:       r.quoteType === 'CRYPTOCURRENCY' ? 'crypto'
                  : r.quoteType === 'ETF' ? 'etf'
                  : 'stock',
      }))
    } catch {
      setForm(f => ({ ...f, ticker: r.symbol, name: r.longname ?? r.symbol }))
    }
    setFetchingPrice(false)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.ticker || !form.shares || !form.entryPrice) return
    setLoading(true)
    addPosition({
      ...form,
      shares:     parseFloat(form.shares),
      entryPrice: parseFloat(form.entryPrice),
    })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-bold text-base">Agregar posición</h2>
          <button onClick={onClose} className="text-muted2 hover:text-txt transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Ticker search */}
          <div>
            <label className="section-label mb-1.5 block">Buscar activo</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
              <input
                type="text"
                value={query || form.ticker}
                onChange={e => { setQuery(e.target.value); set('ticker', e.target.value.toUpperCase()) }}
                placeholder="Ej: AAPL, Bitcoin, SPY..."
                className="w-full bg-s2 border border-border rounded-xl pl-9 pr-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors"
              />
              {(searching || fetchingPrice) && (
                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
              )}
            </div>

            {/* Search results dropdown */}
            {results.length > 0 && (
              <div className="mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-xl">
                {results.slice(0, 6).map(r => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-s2 transition-colors text-left"
                  >
                    <span className="font-mono text-sm font-medium text-txt w-20">{r.symbol}</span>
                    <span className="font-mono text-xs text-muted2 truncate">{r.longname ?? r.shortname}</span>
                    <span className="font-mono text-[0.6rem] text-muted ml-auto shrink-0">{r.exchDisp ?? r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="section-label mb-1.5 block">Nombre</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Meta Platforms"
              className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors"
            />
          </div>

          {/* Type + Sector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-1.5 block">Tipo</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt outline-none focus:border-buy/50 transition-colors"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label mb-1.5 block">Sector</label>
              <input
                value={form.sector}
                onChange={e => set('sector', e.target.value)}
                placeholder="Tecnología"
                className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors"
              />
            </div>
          </div>

          {/* Shares + Entry Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-1.5 block">Cantidad</label>
              <input
                type="number" step="any" min="0"
                value={form.shares}
                onChange={e => set('shares', e.target.value)}
                placeholder="10"
                required
                className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors"
              />
            </div>
            <div>
              <label className="section-label mb-1.5 block">Precio entrada (USD)</label>
              <input
                type="number" step="any" min="0"
                value={form.entryPrice}
                onChange={e => set('entryPrice', e.target.value)}
                placeholder="627.00"
                required
                className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="section-label mb-1.5 block">Fecha de entrada</label>
            <input
              type="date"
              value={form.entryDate}
              onChange={e => set('entryDate', e.target.value)}
              className="w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt outline-none focus:border-buy/50 transition-colors"
            />
          </div>

          {/* Color */}
          <div>
            <label className="section-label mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => set('color', c)}
                  className={clsx(
                    'w-6 h-6 rounded-full transition-transform',
                    form.color === c ? 'scale-125 ring-2 ring-white/30' : 'hover:scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Total cost preview */}
          {form.shares && form.entryPrice && (
            <div className="bg-s2 rounded-xl px-4 py-2.5 flex justify-between items-center">
              <span className="font-mono text-xs text-muted">Inversión total</span>
              <span className="font-mono text-sm font-medium text-txt">
                {fmt.usd(parseFloat(form.shares) * parseFloat(form.entryPrice))}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>Agregar posición</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
