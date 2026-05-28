import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import { Card, StatCell } from '@/components/ui'
import { fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

export default function PortfolioSummary() {
  const { positions, totalCapital, calcPortfolioValue, calcTotalPnl } = usePortfolioStore()
  const { quotes } = useMarketStore()

  const currentValue = calcPortfolioValue(quotes)
  const totalPnl     = calcTotalPnl(quotes)
  const totalPnlPct  = totalCapital > 0 ? (totalPnl / totalCapital) * 100 : 0
  const dayPnl       = Object.values(quotes).reduce((acc, q) => {
    const pos = positions.find(p => p.ticker === q.ticker)
    if (!pos || !q.pct) return acc
    return acc + (pos.shares * pos.entryPrice * q.pct / 100)
  }, 0)

  const cells = [
    { label: 'Valor Total',       value: fmt.usd(currentValue || totalCapital),  valueClass: 'text-txt text-base' },
    { label: 'Capital Invertido', value: fmt.usd(totalCapital),                   valueClass: 'text-muted2' },
    { label: 'P&L Total',         value: fmt.usd(totalPnl),                       valueClass: clsx(pctClass(totalPnl), 'text-base') },
    { label: 'Retorno %',         value: fmt.pct(totalPnlPct),                    valueClass: pctClass(totalPnlPct) },
    { label: 'P&L Hoy',           value: fmt.usd(dayPnl),                         valueClass: pctClass(dayPnl) },
    { label: 'Posiciones',        value: positions.length,                         valueClass: 'text-txt' },
  ]

  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border">
        {cells.map((c, i) => (
          <div key={i} className="px-4 py-3 sm:px-5 sm:py-4">
            <StatCell {...c} />
          </div>
        ))}
      </div>
    </Card>
  )
}
