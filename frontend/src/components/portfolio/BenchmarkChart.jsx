import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { TrendingUp, RefreshCw } from 'lucide-react'
import { Card, SectionLabel } from '@/components/ui'
import { fmt } from '@/utils/formatters'
import axios from 'axios'
import clsx from 'clsx'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' })

function ReturnCard({ label, value, subLabel, sub, color }) {
  const pos = value >= 0
  return (
    <div className={clsx('rounded-xl p-4 border', pos ? 'bg-buy/5 border-buy/20' : 'bg-sell/5 border-sell/20')}>
      <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={clsx('font-mono text-2xl font-bold', pos ? 'text-buy' : 'text-sell')}>
        {pos ? '+' : ''}{value?.toFixed(2)}%
      </div>
      {subLabel && <div className="font-mono text-xs text-muted2 mt-0.5">{subLabel}: <span className="text-txt">{sub}</span></div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl min-w-[180px]">
      <div className="font-mono text-[0.6rem] text-muted mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="font-mono text-xs text-muted2">{p.name}</span>
          </div>
          <span className="font-mono text-xs text-txt">{fmt.usd(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BenchmarkChart({ transactions }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const buys = (transactions ?? []).filter(t => t.type === 'BUY')

  const load = async () => {
    if (!buys.length) return
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await api.post('/portfolio/benchmark', { transactions })
      setData(res)
    } catch {
      setError('No se pudo calcular el benchmark.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])  // eslint-disable-line

  if (!buys.length) return null

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <SectionLabel>
          <TrendingUp size={12} className="inline mr-1.5 text-muted" strokeWidth={2} />
          Portafolio vs SPY vs QQQ
        </SectionLabel>
        <button
          onClick={load}
          disabled={loading}
          className="text-muted2 hover:text-buy transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <div className="w-5 h-5 border-2 border-buy border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-muted">Calculando benchmark histórico…</span>
        </div>
      )}

      {error && <p className="font-mono text-sm text-sell">{error}</p>}

      {data?.summary && !loading && (
        <>
          {/* Return cards */}
          <div className="grid grid-cols-3 gap-3">
            <ReturnCard
              label="Tu portafolio"
              value={data.summary.portfolioReturn}
              subLabel="Valor actual"
              sub={fmt.usd(data.summary.portfolioValue)}
            />
            <ReturnCard
              label="S&P 500 (SPY)"
              value={data.summary.spyReturn}
              subLabel="Si hubieras puesto en SPY"
              sub={fmt.usd(data.summary.spyValue)}
            />
            <ReturnCard
              label="NASDAQ (QQQ)"
              value={data.summary.qqqReturn}
              subLabel="Si hubieras puesto en QQQ"
              sub={fmt.usd(data.summary.qqqValue)}
            />
          </div>

          <div className="bg-s2 rounded-xl px-4 py-2.5 flex justify-between items-center">
            <span className="font-mono text-xs text-muted">Total invertido</span>
            <span className="font-mono text-sm text-txt">{fmt.usd(data.summary.totalInvested)}</span>
          </div>

          {/* Equity curve */}
          {data.equity?.length > 1 && (
            <div>
              <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-3">Evolución del capital ($)</div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.equity} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
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
                      width={46}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={data.summary.totalInvested} stroke="#444" strokeDasharray="3 3" />
                    <Legend
                      iconType="circle" iconSize={6}
                      formatter={v => <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#999' }}>{v}</span>}
                    />
                    <Line type="monotone" dataKey="portfolio" name="Portafolio" stroke="#00e5a0" strokeWidth={2} dot={{ r: 3, fill: '#00e5a0' }} connectNulls />
                    <Line type="monotone" dataKey="spy"       name="SPY"        stroke="#4f8cff" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="qqq"       name="QQQ"        stroke="#c084fc" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="invested"  name="Invertido"  stroke="#555"    strokeWidth={1}   dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
