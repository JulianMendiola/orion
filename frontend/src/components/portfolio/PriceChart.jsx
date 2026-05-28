import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { marketService } from '@/services/marketService'
import { Skeleton } from '@/components/ui'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const RANGES = ['1mo', '3mo', '6mo', '1y']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-xl">
      <p className="font-mono text-[0.6rem] text-muted">{new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <p className="font-mono text-sm text-txt font-medium">{fmt.usd(d.close)}</p>
    </div>
  )
}

export default function PriceChart({ ticker, entryPrice, color = '#00e5a0' }) {
  const [range, setRange]   = useState('3mo')
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!ticker) return
    setLoading(true)
    setError(null)
    marketService.getHistory(ticker, range)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [ticker, range])

  const firstClose = data[0]?.close
  const lastClose  = data[data.length - 1]?.close
  const totalPct   = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : null
  const isUp       = totalPct >= 0

  // Add entry price line as reference area
  const min = data.length ? Math.min(...data.map(d => d.close)) * 0.995 : 0
  const max = data.length ? Math.max(...data.map(d => d.close)) * 1.005 : 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="font-mono text-sm font-medium">{ticker}</span>
          {totalPct !== null && (
            <span className={clsx('font-mono text-xs font-medium', isUp ? 'text-up' : 'text-down')}>
              {fmt.pct(totalPct)}
            </span>
          )}
        </div>
        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                'font-mono text-[0.65rem] px-2.5 py-1 rounded-lg transition-all',
                range === r ? 'bg-buy/20 text-buy' : 'text-muted2 hover:text-txt'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading && <Skeleton className="h-36 w-full rounded-xl" />}

      {error && (
        <div className="h-36 flex items-center justify-center">
          <p className="font-mono text-xs text-muted">No se pudo cargar el historial</p>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isUp ? '#00e5a0' : '#f43f5e'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isUp ? '#00e5a0' : '#f43f5e'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={d => new Date(d).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              tick={{ fontSize: 9, fill: '#4a4f6e', fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min, max]}
              tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 9, fill: '#4a4f6e', fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={isUp ? '#00e5a0' : '#f43f5e'}
              strokeWidth={1.5}
              fill={`url(#grad-${ticker})`}
              dot={false}
              activeDot={{ r: 3, fill: isUp ? '#00e5a0' : '#f43f5e', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Entry price reference */}
      {entryPrice && lastClose && (
        <div className="flex items-center gap-4 pt-1 border-t border-border">
          <div>
            <p className="font-mono text-[0.58rem] text-muted uppercase tracking-wider">Entrada</p>
            <p className="font-mono text-xs text-muted2">{fmt.usd(entryPrice)}</p>
          </div>
          <div>
            <p className="font-mono text-[0.58rem] text-muted uppercase tracking-wider">Actual</p>
            <p className="font-mono text-xs text-txt">{fmt.usd(lastClose)}</p>
          </div>
          <div>
            <p className="font-mono text-[0.58rem] text-muted uppercase tracking-wider">P&L</p>
            <p className={clsx('font-mono text-xs font-medium', lastClose >= entryPrice ? 'text-up' : 'text-down')}>
              {fmt.pct(((lastClose - entryPrice) / entryPrice) * 100)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
