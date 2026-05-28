import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui'
import { usePortfolioStore } from '@/store/portfolioStore'
import { marketService } from '@/services/marketService'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const TABS = [
  { key: 'BUY',      label: 'Comprar',    icon: TrendingUp,   color: 'text-buy',  bg: 'bg-buy/20',  border: 'border-buy/30' },
  { key: 'SELL',     label: 'Vender',     icon: TrendingDown, color: 'text-sell', bg: 'bg-sell/20', border: 'border-sell/30' },
  { key: 'DEPOSIT',  label: 'Depositar',  icon: DollarSign,   color: 'text-txt',  bg: 'bg-s2',      border: 'border-border' },
]

const BLANK = {
  ticker: '', date: new Date().toISOString().split('T')[0],
  shares: '', price: '', amount: '', notes: '',
}

function InputField({ label, children }) {
  return (
    <div>
      <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-s2 border border-border rounded-xl px-3 py-2.5 font-mono text-sm text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors'

export default function AddTransactionModal({ onClose }) {
  const { addTransaction, addCash, getActive, positions } = usePortfolioStore()
  const [tab, setTab]           = useState('BUY')
  const [form, setForm]         = useState(BLANK)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [loading, setLoading]   = useState(false)
  const debounceRef = useRef(null)

  const portfolio = getActive()

  // Ticker search
  useEffect(() => {
    if (tab === 'DEPOSIT') return
    if (query.length < 2) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await marketService.search(query)
        setResults(res.filter(r => r.quoteType && r.symbol).slice(0, 6))
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, tab])

  const selectTicker = async (r) => {
    setQuery(''); setResults([])
    setFetchingPrice(true)
    try {
      const quotes = await marketService.getWatchlistQuotes([r.symbol])
      const price  = quotes[r.symbol]?.price ?? ''
      setForm(f => ({ ...f, ticker: r.symbol, price: price ? price.toFixed(2) : '' }))
    } catch {
      setForm(f => ({ ...f, ticker: r.symbol }))
    }
    setFetchingPrice(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-compute amount from shares×price
  const total = form.shares && form.price
    ? parseFloat(form.shares) * parseFloat(form.price)
    : null

  // Current holdings for this ticker (for sell validation)
  const currentHolding = positions.find(p => p.ticker === form.ticker)

  const submit = (e) => {
    e.preventDefault()
    setLoading(true)

    if (tab === 'DEPOSIT') {
      const amount = parseFloat(form.amount)
      if (!isNaN(amount) && amount > 0) {
        addCash(amount, form.date, form.notes)
      }
    } else {
      const tx = {
        type:   tab,
        ticker: form.ticker.toUpperCase().trim(),
        date:   form.date,
        shares: parseFloat(form.shares),
        price:  parseFloat(form.price),
        notes:  form.notes,
      }
      if (tx.ticker && !isNaN(tx.shares) && !isNaN(tx.price)) {
        addTransaction(tx)
      }
    }

    setLoading(false)
    onClose()
  }

  const isValid = tab === 'DEPOSIT'
    ? (form.amount && parseFloat(form.amount) > 0)
    : (form.ticker && form.shares && form.price && parseFloat(form.shares) > 0 && parseFloat(form.price) > 0)

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-bold text-base">Nueva operación</h2>
          <button onClick={onClose} className="text-muted2 hover:text-txt transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setForm(BLANK); setQuery(''); setResults([]) }}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 font-mono text-sm font-medium transition-all',
                  tab === t.key
                    ? `${t.color} border-b-2 border-current`
                    : 'text-muted2 hover:text-txt'
                )}
              >
                <Icon size={13} strokeWidth={2} />
                {t.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {tab !== 'DEPOSIT' && (
            <>
              {/* Ticker */}
              <InputField label="Activo">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
                  <input
                    type="text"
                    value={query || form.ticker}
                    onChange={e => { const v = e.target.value.toUpperCase(); setQuery(v); set('ticker', v) }}
                    placeholder="AAPL, META, YPF, NU…"
                    className={clsx(inputCls, 'pl-9 pr-9')}
                    autoFocus
                  />
                  {(searching || fetchingPrice) && (
                    <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
                  )}
                </div>
                {results.length > 0 && (
                  <div className="mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-xl z-10 relative">
                    {results.map(r => (
                      <button key={r.symbol} type="button" onClick={() => selectTicker(r)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-s2 transition-colors text-left">
                        <span className="font-mono text-sm font-medium text-txt w-20">{r.symbol}</span>
                        <span className="font-mono text-xs text-muted2 truncate">{r.longname ?? r.shortname}</span>
                        <span className="font-mono text-[0.6rem] text-muted ml-auto shrink-0">{r.exchDisp ?? ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </InputField>

              {/* Sell: show current holding */}
              {tab === 'SELL' && currentHolding && (
                <div className="bg-s2 rounded-xl px-4 py-2.5 flex justify-between items-center">
                  <span className="font-mono text-xs text-muted">Tenencia actual</span>
                  <span className="font-mono text-sm text-txt">{currentHolding.shares} accs · entrada {fmt.usd(currentHolding.entryPrice)}</span>
                </div>
              )}

              {/* Date + Price */}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Fecha">
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
                </InputField>
                <InputField label="Precio (USD)">
                  <input
                    type="number" step="any" min="0"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </InputField>
              </div>

              {/* Shares */}
              <InputField label="Cantidad de acciones">
                <input
                  type="number" step="any" min="0"
                  value={form.shares}
                  onChange={e => set('shares', e.target.value)}
                  placeholder="10.5"
                  className={inputCls}
                />
              </InputField>
            </>
          )}

          {tab === 'DEPOSIT' && (
            <>
              <InputField label="Monto (USD)">
                <input
                  type="number" step="any" min="0"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="1000.00"
                  className={inputCls}
                  autoFocus
                />
              </InputField>
              <InputField label="Fecha">
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} />
              </InputField>
            </>
          )}

          {/* Notes */}
          <InputField label="Notas (opcional)">
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Compra por corrección técnica…"
              className={inputCls}
            />
          </InputField>

          {/* Total preview */}
          {total !== null && (
            <div className={clsx('rounded-xl px-4 py-3 flex justify-between items-center border', activeTab?.bg, activeTab?.border)}>
              <span className="font-mono text-xs text-muted">Total {tab === 'BUY' ? 'invertido' : 'recibido'}</span>
              <span className={clsx('font-mono text-base font-semibold', activeTab?.color)}>{fmt.usd(total)}</span>
            </div>
          )}

          {/* Portfolio cash info */}
          {tab === 'BUY' && portfolio && (
            <div className="flex justify-between items-center">
              <span className="font-mono text-[0.6rem] text-muted">Liquidez disponible</span>
              <span className="font-mono text-xs text-txt">{fmt.usd(portfolio.cash)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading} disabled={!isValid}>
              Confirmar {TABS.find(t => t.key === tab)?.label.toLowerCase()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
