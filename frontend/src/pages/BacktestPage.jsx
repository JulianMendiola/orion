import { useState, useRef, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { FlaskConical, TrendingUp, TrendingDown, ArrowUpDown, ShieldAlert, Info, Search } from 'lucide-react'
import { Card, SectionLabel, Button } from '@/components/ui'
import { signalsService } from '@/services/signalsService'
import { marketService } from '@/services/marketService'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const RANGES = ['3mo', '6mo', '1y', '2y']
const RANGE_LABEL = { '3mo': '3 meses', '6mo': '6 meses', '1y': '1 año', '2y': '2 años' }

const STRATEGIES = [
  {
    id:    'rsi_sma',
    label: 'RSI + SMA',
    desc:  'Compra en sobreventa (RSI<35) sobre SMA50 · Vende en sobrecompra (RSI>70)',
    tags:  ['RSI 14', 'SMA 20', 'SMA 50'],
  },
  {
    id:    'roc_volume',
    label: 'ROC + Volumen',
    desc:  'Compra caídas con bajo volumen · Sale cuando ROC>10% o spike de volumen 2x',
    tags:  ['ROC 3d', 'ROC 5d', 'Vol relativo'],
  },
  {
    id:    'bollinger',
    label: 'Bollinger Bands',
    desc:  'Compra en toque de banda inferior (−2σ) · Sale en toque de banda superior (+2.5σ)',
    tags:  ['SMA 20', '±2σ', 'Reversión a media'],
  },
  {
    id:    'momentum',
    label: 'Momentum Breakout',
    desc:  'Compra breakout de máximos 52 semanas con SMA alineadas · Sale cuando momentum revierte',
    tags:  ['Máx 52s', 'SMA 20/50', 'Momentum 10d'],
  },
]

function MetricCard({ label, value, sub, positive, icon: Icon, tooltip }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">{label}</div>
            {tooltip && (
              <div className="group relative">
                <Info size={9} className="text-muted cursor-default" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 w-44">
                  <div className="bg-surface border border-border rounded-lg px-2.5 py-2 shadow-xl">
                    <p className="font-mono text-[0.6rem] text-muted2 leading-relaxed">{tooltip}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={clsx(
            'font-mono text-xl font-semibold',
            positive === true ? 'text-buy' : positive === false ? 'text-sell' : 'text-txt'
          )}>
            {value}
          </div>
          {sub && <div className="font-mono text-xs text-muted mt-0.5 truncate">{sub}</div>}
        </div>
        {Icon && <Icon size={18} className="text-muted mt-1 shrink-0" strokeWidth={1.5} />}
      </div>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl">
      <div className="font-mono text-[0.6rem] text-muted mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="font-mono text-xs text-muted2">{p.name}:</span>
          <span className="font-mono text-xs text-txt">{fmt.usd(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Buscador de ticker con autocompletado ──────────────────
function TickerSearch({ value, onChange, onSelect, onEnter }) {
  const [query, setQuery]       = useState(value)
  const [suggestions, setSugs]  = useState([])
  const [open, setOpen]         = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  // Cerrar al click afuera
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = e => {
    const v = e.target.value.toUpperCase()
    setQuery(v)
    onChange(v)
    setOpen(true)
    clearTimeout(debounceRef.current)
    if (v.length < 1) { setSugs([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await marketService.search(v)
      setSugs(res.slice(0, 6))
      setSearching(false)
    }, 280)
  }

  const pick = item => {
    setQuery(item.symbol)
    onChange(item.symbol)
    onSelect?.(item.symbol)
    setSugs([])
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-[150px]">
      <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1.5">Ticker</label>
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" strokeWidth={2} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={e => { if (e.key === 'Enter') { setOpen(false); onEnter?.() } if (e.key === 'Escape') setOpen(false) }}
          onFocus={() => query.length > 0 && setOpen(true)}
          placeholder="AAPL, NVDA, SPY…"
          className="w-full bg-s2 border border-border text-txt text-sm font-mono pl-8 pr-3 py-2 rounded-lg outline-none focus:border-buy/50 placeholder:text-muted"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-buy border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden">
          {suggestions.map(item => (
            <button
              key={item.symbol}
              onMouseDown={() => pick(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-s2 transition-colors text-left"
            >
              <span className="font-mono text-xs font-semibold text-txt w-20 shrink-0">{item.symbol}</span>
              <span className="font-mono text-xs text-muted2 truncate">{item.shortname ?? item.longname ?? ''}</span>
              <span className="font-mono text-[0.55rem] text-muted ml-auto shrink-0 uppercase">{item.exchDisp ?? item.exchange ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BacktestPage() {
  const [ticker, setTicker]     = useState('')
  const [range, setRange]       = useState('1y')
  const [strategy, setStrategy] = useState('rsi_sma')
  const [commission, setCommission] = useState('0.1')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const run = async () => {
    const t = ticker.toUpperCase().trim()
    if (!t) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await signalsService.backtest(t, range, strategy, parseFloat(commission) || 0)
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.response?.data?.error ?? e.message ?? 'Error al ejecutar el backtest.')
    }
    setLoading(false)
  }

  const stratBetter = result ? result.stratReturn > result.buyHoldReturn : null
  const activeStrat = STRATEGIES.find(s => s.id === strategy)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-2xl tracking-tight">Backtesting</h1>
        <p className="text-muted2 text-sm mt-0.5">Simulá el rendimiento histórico de 4 estrategias técnicas con Macro Guard</p>
      </div>

      {/* ── Configuración ── */}
      <Card className="p-5 space-y-4">

        {/* Estrategia */}
        <div>
          <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-2">Estrategia</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={clsx(
                  'text-left p-3 rounded-xl border transition-all',
                  strategy === s.id
                    ? 'bg-buy/10 border-buy/40 text-buy'
                    : 'bg-s2 border-border text-muted2 hover:text-txt hover:border-border2'
                )}
              >
                <div className="font-mono text-xs font-medium mb-1">{s.label}</div>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map(t => (
                    <span key={t} className="font-mono text-[0.55rem] bg-s3 text-muted px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          {activeStrat && (
            <p className="font-mono text-[0.65rem] text-muted mt-2 px-1">{activeStrat.desc}</p>
          )}
        </div>

        {/* Ticker + Rango + Comisión + Botón */}
        <div className="flex flex-wrap gap-3 items-end">
          <TickerSearch
            value={ticker}
            onChange={setTicker}
            onSelect={setTicker}
            onEnter={run}
          />

          <div>
            <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1.5">Período</label>
            <div className="flex gap-1.5">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={clsx(
                    'font-mono text-xs px-3 py-2 rounded-lg transition-all',
                    range === r
                      ? 'bg-buy/20 text-buy border border-buy/30'
                      : 'bg-s2 text-muted2 border border-border hover:text-txt'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="w-28">
            <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1.5">Comisión %</label>
            <input
              type="number"
              value={commission}
              onChange={e => setCommission(e.target.value)}
              step="0.05"
              min="0"
              max="2"
              placeholder="0.1"
              className="w-full bg-s2 border border-border text-txt text-sm font-mono px-3 py-2 rounded-lg outline-none focus:border-buy/50 placeholder:text-muted"
            />
          </div>

          <Button onClick={run} loading={loading} disabled={!ticker.trim()}>
            <FlaskConical size={14} />
            Simular
          </Button>
        </div>
      </Card>

      {error && (
        <div className="bg-sell/10 border border-sell/20 rounded-xl px-5 py-4">
          <p className="font-mono text-sm text-sell">{error}</p>
        </div>
      )}

      {loading && (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-buy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted2 text-sm">Simulando estrategia {activeStrat?.label}…</p>
          <p className="font-mono text-xs text-muted mt-1">Calculando Sharpe · Sortino · Drawdown · Profit Factor</p>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-6">

          {/* ── Veredicto ── */}
          <Card className={clsx('p-5 border', stratBetter ? 'border-buy/30 bg-buy/5' : 'border-sell/20 bg-sell/5')}>
            <div className="flex items-start gap-3">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', stratBetter ? 'bg-buy/20' : 'bg-sell/20')}>
                {stratBetter ? <TrendingUp size={14} className="text-buy" /> : <TrendingDown size={14} className="text-sell" />}
              </div>
              <div>
                <div className={clsx('font-mono text-xs font-medium mb-1', stratBetter ? 'text-buy' : 'text-sell')}>
                  {stratBetter ? `${result.strategyLabel} SUPERÓ AL MERCADO` : 'BUY & HOLD FUE MEJOR'}
                </div>
                <p className="text-sm text-txt">
                  En {RANGE_LABEL[result.range]}, la estrategia {result.strategyLabel} retornó{' '}
                  <span className={clsx('font-mono font-medium', result.stratReturn >= 0 ? 'text-buy' : 'text-sell')}>
                    {result.stratReturn >= 0 ? '+' : ''}{result.stratReturn}%
                  </span>
                  {' '}vs.{' '}
                  <span className={clsx('font-mono font-medium', result.buyHoldReturn >= 0 ? 'text-buy' : 'text-sell')}>
                    {result.buyHoldReturn >= 0 ? '+' : ''}{result.buyHoldReturn}%
                  </span>
                  {' '}comprando y manteniendo {result.ticker}.
                  {result.commission > 0 && (
                    <span className="text-muted"> (comisión {result.commission}% por trade aplicada)</span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* ── Métricas principales ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Retorno estrategia"
              value={`${result.stratReturn >= 0 ? '+' : ''}${result.stratReturn}%`}
              sub={`Capital final: ${fmt.usd(result.finalValue)}`}
              positive={result.stratReturn >= 0}
              icon={TrendingUp}
            />
            <MetricCard
              label="Buy & Hold"
              value={`${result.buyHoldReturn >= 0 ? '+' : ''}${result.buyHoldReturn}%`}
              sub="Sin operar"
              positive={result.buyHoldReturn >= 0}
              icon={TrendingUp}
            />
            <MetricCard
              label="Max Drawdown"
              value={`-${result.maxDrawdown}%`}
              sub="Peor caída desde máximo"
              positive={false}
              icon={ShieldAlert}
            />
            <MetricCard
              label="Operaciones"
              value={result.tradesCount}
              sub={result.winRate !== null ? `Win rate: ${result.winRate}%` : 'Sin trades cerrados'}
              positive={result.winRate !== null ? result.winRate > 50 : null}
              icon={ArrowUpDown}
            />
          </div>

          {/* ── Métricas avanzadas ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Sharpe Ratio"
              value={result.sharpe ?? '—'}
              sub="Retorno ajustado por riesgo"
              positive={result.sharpe !== null ? result.sharpe > 1 : null}
              tooltip="Sharpe > 1 = bueno · > 2 = excelente · < 0 = peor que efectivo"
            />
            <MetricCard
              label="Sortino Ratio"
              value={result.sortino ?? '—'}
              sub="Solo penaliza caídas"
              positive={result.sortino !== null ? result.sortino > 1 : null}
              tooltip="Como Sharpe pero solo mide el riesgo bajista. Más útil en estrategias asimétricas."
            />
            <MetricCard
              label="Profit Factor"
              value={result.profitFactor ?? '—'}
              sub="Ganancias / Pérdidas"
              positive={result.profitFactor !== null ? result.profitFactor > 1 : null}
              tooltip="PF > 1.5 = estrategia rentable · > 2 = muy buena · < 1 = pierde dinero"
            />
            <MetricCard
              label="Duración media"
              value={result.avgDuration ? `${result.avgDuration}d` : '—'}
              sub={result.avgWin || result.avgLoss ? `Win $${result.avgWin ?? '—'} · Loss $${result.avgLoss ?? '—'}` : 'Por trade'}
            />
          </div>

          {/* ── Equity curve ── */}
          <Card className="p-5">
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-4">
              Evolución del capital ($10,000 inicial) · {result.strategyLabel}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00e5a0" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bhGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4f8cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => d?.slice(5)}
                    tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                    tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
                    axisLine={false} tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={10000} stroke="#444" strokeDasharray="3 3" />
                  <Legend
                    iconType="circle" iconSize={6}
                    formatter={v => <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#999' }}>{v}</span>}
                  />
                  <Area type="monotone" dataKey="strat" name={result.strategyLabel}
                    stroke="#00e5a0" strokeWidth={1.5} fill="url(#stratGrad)"
                    dot={false} activeDot={{ r: 3, fill: '#00e5a0' }} />
                  <Area type="monotone" dataKey="buyHold" name="Buy & Hold"
                    stroke="#4f8cff" strokeWidth={1.5} fill="url(#bhGrad)"
                    dot={false} activeDot={{ r: 3, fill: '#4f8cff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Historial de trades ── */}
          {result.trades.length > 0 && (
            <div className="space-y-2">
              <SectionLabel>Historial de operaciones ({result.trades.length})</SectionLabel>
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-left px-4 py-3">Fecha</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-left px-4 py-3">Tipo</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-right px-4 py-3">Precio</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-right px-4 py-3 hidden sm:table-cell">Salida</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-right px-4 py-3">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-s2 transition-colors">
                        <td className="font-mono text-xs text-muted2 px-4 py-2.5">{t.date}</td>
                        <td className="px-4 py-2.5">
                          <span className={clsx(
                            'font-mono text-[0.6rem] px-2 py-0.5 rounded border',
                            t.type === 'BUY'
                              ? 'bg-buy/15 text-buy border-buy/25'
                              : 'bg-sell/15 text-sell border-sell/25'
                          )}>
                            {t.type === 'BUY' ? 'COMPRA' : 'VENTA'}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-txt text-right px-4 py-2.5">{fmt.usd(t.price)}</td>
                        <td className="font-mono text-[0.6rem] text-muted text-right px-4 py-2.5 hidden sm:table-cell">
                          {t.exit ?? '—'}
                        </td>
                        <td className={clsx(
                          'font-mono text-xs text-right px-4 py-2.5',
                          t.pnl !== undefined ? (t.pnl >= 0 ? 'text-buy' : 'text-sell') : 'text-muted'
                        )}>
                          {t.pnl !== undefined
                            ? `${t.pnl >= 0 ? '+' : ''}${fmt.usd(t.pnl)} (${t.pct >= 0 ? '+' : ''}${t.pct}%)`
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <Card className="p-12 text-center">
          <FlaskConical size={32} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted2 text-sm">Elegí una estrategia, ingresá un ticker y simulá.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {['RSI + SMA', 'Bollinger', 'ROC + Vol', 'Breakout'].map(s => (
              <span key={s} className="font-mono text-[0.6rem] text-muted bg-s2 px-2.5 py-1 rounded-lg">{s}</span>
            ))}
          </div>
          <p className="font-mono text-xs text-muted mt-3">Incluye Macro Guard · Sharpe · Sortino · Profit Factor · Comisiones</p>
        </Card>
      )}
    </div>
  )
}
