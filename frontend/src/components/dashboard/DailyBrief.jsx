import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, SectionLabel, Skeleton } from '@/components/ui'
import { signalsService } from '@/services/signalsService'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import clsx from 'clsx'

const RISK_CLASS = { BAJO: 'badge-buy', MEDIO: 'badge-hold', ALTO: 'badge-sell' }

export default function DailyBrief() {
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const { positions, totalCapital } = usePortfolioStore()
  const { quotes } = useMarketStore()

  const generate = async () => {
    setLoading(true)
    try {
      const summary = {
        positions: positions.map(p => ({
          ticker: p.ticker,
          currentPrice: quotes[p.ticker]?.price ?? p.entryPrice,
          entryPrice: p.entryPrice,
          shares: p.shares,
        })),
        totalCapital,
      }
      const result = await signalsService.generateBrief(summary)
      setBrief(result)
    } catch {
      setBrief({ brief: 'No se pudo generar el brief. Verifica tu conexión.', riskLevel: 'MEDIO' })
    }
    setLoading(false)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Brief del día</SectionLabel>
        <button
          onClick={generate}
          disabled={loading}
          className="text-muted2 hover:text-buy transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2} />
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      )}

      {!loading && !brief && (
        <p className="font-mono text-xs text-muted leading-relaxed">
          Pulsa el botón para generar el análisis de hoy con IA.
        </p>
      )}

      {!loading && brief && (
        <div className="space-y-3">
          <p className="text-xs text-muted2 leading-relaxed">{brief.brief}</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Riesgo</span>
            <span className={clsx('text-[0.6rem] px-2 py-0.5 rounded-full border font-mono uppercase tracking-wider',
              RISK_CLASS[brief.riskLevel] ?? 'badge-wait'
            )}>{brief.riskLevel}</span>
          </div>
        </div>
      )}
    </Card>
  )
}
