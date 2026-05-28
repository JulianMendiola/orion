import { useState } from 'react'
import { Zap } from 'lucide-react'
import { Card, SectionLabel, SignalBadge, Button, Skeleton } from '@/components/ui'
import { signalsService } from '@/services/signalsService'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fmt } from '@/utils/formatters'

export default function QuickSignals() {
  const { positions } = usePortfolioStore()
  const [signals, setSignals] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const tickers = positions.map(p => p.ticker)
      const entries = Object.fromEntries(positions.map(p => [p.ticker, p.entryPrice]))
      const result  = await signalsService.generateSignals(tickers, entries)
      setSignals(result)
    } catch {
      setSignals(null)
    }
    setLoading(false)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Señales IA — Hoy</SectionLabel>
        <Button size="sm" onClick={run} loading={loading} variant="primary">
          <Zap size={12} />
          Analizar
        </Button>
      </div>

      {!signals && !loading && (
        <div className="text-center py-6">
          <p className="font-mono text-xs text-muted">Pulsa "Analizar" para obtener señales en tiempo real.</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {positions.map(p => (
            <div key={p.ticker} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-s2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      )}

      {signals && !loading && (
        <div className="space-y-2">
          {Object.entries(signals).map(([ticker, data]) => (
            <div key={ticker} className="flex items-start gap-4 px-4 py-3 rounded-xl bg-s2">
              <div className="w-12 shrink-0">
                <span className="font-mono text-sm font-medium text-txt">{ticker}</span>
              </div>
              <div className="w-28 shrink-0">
                <div className="font-mono text-sm">{fmt.usd(data.price)}</div>
                <div className={`font-mono text-xs ${data.pct_change >= 0 ? 'text-up' : 'text-down'}`}>
                  {fmt.pct(data.pct_change)}
                </div>
              </div>
              <div className="shrink-0">
                <SignalBadge signal={data.signal} />
              </div>
              <p className="text-xs text-muted2 leading-relaxed flex-1 hidden xl:block">
                {data.analysis}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
