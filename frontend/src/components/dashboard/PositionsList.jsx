import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import { Card, SectionLabel, SignalBadge, Skeleton } from '@/components/ui'
import { fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

export default function PositionsList() {
  const { positions } = usePortfolioStore()
  const { quotes, refreshing } = useMarketStore()

  return (
    <Card className="p-5">
      <SectionLabel>Mis Posiciones</SectionLabel>

      <div className="space-y-2">
        {positions.map((pos) => {
          const q = quotes[pos.ticker]
          const currentPrice = q?.price ?? pos.entryPrice
          const pnlPct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100
          const pnlUsd = (currentPrice - pos.entryPrice) * pos.shares
          const currentValue = currentPrice * pos.shares

          return (
            <div
              key={pos.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-s2 hover:bg-s3 transition-colors"
            >
              {/* Color dot + ticker */}
              <div className="flex items-center gap-2.5 w-28">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pos.color }} />
                <div>
                  <div className="font-mono text-sm font-medium text-txt">{pos.ticker}</div>
                  <div className="font-mono text-[0.58rem] text-muted truncate max-w-[80px]">{pos.sector}</div>
                </div>
              </div>

              {/* Price */}
              <div className="flex-1">
                {refreshing
                  ? <Skeleton className="h-4 w-16" />
                  : <span className="font-mono text-sm">{fmt.usd(currentPrice)}</span>
                }
                {q?.pct != null && (
                  <span className={clsx('font-mono text-xs ml-2', pctClass(q.pct))}>
                    {fmt.pct(q.pct)}
                  </span>
                )}
              </div>

              {/* Entry */}
              <div className="text-right w-20 hidden lg:block">
                <div className="font-mono text-xs text-muted">Entrada</div>
                <div className="font-mono text-xs text-muted2">{fmt.usd(pos.entryPrice)}</div>
              </div>

              {/* Shares + Value */}
              <div className="text-right w-24 hidden xl:block">
                <div className="font-mono text-xs text-muted">{pos.shares} acc.</div>
                <div className="font-mono text-xs text-txt">{fmt.usd(currentValue)}</div>
              </div>

              {/* P&L */}
              <div className={clsx('text-right w-20 font-mono text-sm font-medium', pctClass(pnlPct))}>
                {fmt.pct(pnlPct)}
                <div className="text-xs opacity-70">{fmt.usd(pnlUsd)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
