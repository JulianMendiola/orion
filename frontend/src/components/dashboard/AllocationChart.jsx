import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import { Card, SectionLabel } from '@/components/ui'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

const COLORS = ['#4f8cff', '#00e5a0', '#c084fc', '#f97316', '#facc15', '#f43f5e', '#38bdf8', '#a3e635']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-s3 border border-border2 rounded-xl px-3 py-2 font-mono text-xs shadow-xl">
      <div className="text-txt font-medium mb-0.5">{d.name}</div>
      <div className="text-muted2">{fmt.usd(d.value)}</div>
      <div className="text-muted">{d.payload.pct}%</div>
    </div>
  )
}

export default function AllocationChart({ compact = false }) {
  const { positions, getActive } = usePortfolioStore()
  const { quotes } = useMarketStore()

  const portfolio  = getActive()
  const cash       = portfolio?.cash ?? 0

  const posData = positions.map((pos, i) => {
    const q     = quotes[pos.ticker]
    const value = (q?.price ?? pos.entryPrice) * pos.shares
    return { name: pos.ticker, value, color: COLORS[i % COLORS.length] }
  })

  const allData = cash > 0
    ? [...posData, { name: 'Liquidez', value: cash, color: '#666' }]
    : posData

  const total = allData.reduce((s, d) => s + d.value, 0)
  const data  = allData.map(d => ({ ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0' }))

  if (data.length === 0) {
    return (
      <Card className="p-5">
        <SectionLabel>Distribución</SectionLabel>
        <div className="h-32 flex items-center justify-center">
          <p className="font-mono text-xs text-muted">Sin posiciones</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <SectionLabel>Distribución</SectionLabel>

      <ResponsiveContainer width="100%" height={compact ? 140 : 170}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={compact ? 38 : 48}
            outerRadius={compact ? 58 : 70}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="font-mono text-xs text-txt">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted2 hidden sm:block">{fmt.usd(d.value)}</span>
              <span className="font-mono text-xs text-muted w-10 text-right">{d.pct}%</span>
            </div>
          </div>
        ))}
        {total > 0 && (
          <div className="flex justify-between pt-2 border-t border-border mt-2">
            <span className="font-mono text-xs text-muted">Total</span>
            <span className="font-mono text-xs text-txt font-medium">{fmt.usd(total)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
