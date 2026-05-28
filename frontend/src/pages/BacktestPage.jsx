import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { FlaskConical, TrendingUp, TrendingDown, ArrowUpDown, ShieldAlert } from 'lucide-react'
import { Card, SectionLabel, Button } from '@/components/ui'
import { signalsService } from '@/services/signalsService'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const RANGES = ['3mo', '6mo', '1y', '2y']
const RANGE_LABEL = { '3mo': '3 meses', '6mo': '6 meses', '1y': '1 año', '2y': '2 años' }

function MetricCard({ label, value, sub, positive, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">{label}</div>
          <div className={clsx(
            'font-mono text-xl font-semibold',
            positive === true ? 'text-buy' : positive === false ? 'text-sell' : 'text-txt'
          )}>
            {value}
          </div>
          {sub && <div className="font-mono text-xs text-muted mt-0.5">{sub}</div>}
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

export default function BacktestPage() {
  const [ticker, setTicker] = useState('')
  const [range, setRange]   = useState('1y')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const run = async () => {
    const t = ticker.toUpperCase().trim()
    if (!t) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await signalsService.backtest(t, range)
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (e) {
      setError(e.message ?? 'Error al ejecutar el backtest.')
    }
    setLoading(false)
  }

  const stratBetter = result ? result.stratReturn > result.buyHoldReturn : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-2xl tracking-tight">Backtesting</h1>
        <p className="text-muted2 text-sm mt-0.5">Simulá el rendimiento histórico de las señales técnicas</p>
      </div>

      {/* Config */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1.5">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && run()}
              placeholder="AAPL, NVDA, META…"
              className="w-full bg-s2 border border-border text-txt text-sm font-mono px-3 py-2 rounded-lg outline-none focus:border-buy/50 placeholder:text-muted"
            />
          </div>
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
          <p className="text-muted2 text-sm">Simulando señales históricas…</p>
          <p className="font-mono text-xs text-muted mt-1">Esto puede tomar unos segundos</p>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-6">
          {/* Veredicto */}
          <Card className={clsx('p-5 border', stratBetter ? 'border-buy/30 bg-buy/5' : 'border-sell/20 bg-sell/5')}>
            <div className="flex items-start gap-3">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', stratBetter ? 'bg-buy/20' : 'bg-sell/20')}>
                {stratBetter ? <TrendingUp size={14} className="text-buy" /> : <TrendingDown size={14} className="text-sell" />}
              </div>
              <div>
                <div className={clsx('font-mono text-xs font-medium mb-1', stratBetter ? 'text-buy' : 'text-sell')}>
                  {stratBetter ? 'LA ESTRATEGIA SUPERÓ AL MERCADO' : 'BUY & HOLD FUE MEJOR'}
                </div>
                <p className="text-sm text-txt">
                  En {RANGE_LABEL[result.range]}, la estrategia de señales retornó{' '}
                  <span className={clsx('font-mono font-medium', result.stratReturn >= 0 ? 'text-buy' : 'text-sell')}>
                    {result.stratReturn >= 0 ? '+' : ''}{result.stratReturn}%
                  </span>
                  {' '}vs. {' '}
                  <span className={clsx('font-mono font-medium', result.buyHoldReturn >= 0 ? 'text-buy' : 'text-sell')}>
                    {result.buyHoldReturn >= 0 ? '+' : ''}{result.buyHoldReturn}%
                  </span>
                  {' '}comprando y manteniendo {result.ticker}.
                </p>
              </div>
            </div>
          </Card>

          {/* Métricas */}
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

          {/* Gráfico equity curve */}
          <Card className="p-5">
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-4">Evolución del capital ($10,000 inicial)</div>
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
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                    tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={10000} stroke="#444" strokeDasharray="3 3" />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    formatter={(v) => <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#999' }}>{v}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="strat"
                    name="Estrategia señales"
                    stroke="#00e5a0"
                    strokeWidth={1.5}
                    fill="url(#stratGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#00e5a0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="buyHold"
                    name="Buy & Hold"
                    stroke="#4f8cff"
                    strokeWidth={1.5}
                    fill="url(#bhGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#4f8cff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Historial de trades */}
          {result.trades.length > 0 && (
            <div className="space-y-2">
              <SectionLabel>Historial de operaciones</SectionLabel>
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-left px-4 py-3">Fecha</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-left px-4 py-3">Tipo</th>
                      <th className="font-mono text-[0.6rem] text-muted uppercase tracking-wider text-right px-4 py-3">Precio</th>
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
                        <td className={clsx('font-mono text-xs text-right px-4 py-2.5', t.pnl !== undefined ? (t.pnl >= 0 ? 'text-buy' : 'text-sell') : 'text-muted')}>
                          {t.pnl !== undefined ? `${t.pnl >= 0 ? '+' : ''}${fmt.usd(t.pnl)} (${t.pct >= 0 ? '+' : ''}${t.pct}%)` : '—'}
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
          <p className="text-muted2 text-sm">Ingresá un ticker y un período para simular las señales técnicas.</p>
          <p className="font-mono text-xs text-muted mt-1">RSI · SMA20/50/200 · Momentum — vs. Buy & Hold</p>
        </Card>
      )}
    </div>
  )
}
