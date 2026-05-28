import { useState } from 'react'
import {
  Plus, Trash2, Target, ChevronDown, ChevronUp,
  PenLine, Check, X, Wallet, DollarSign, FileUp,
  Zap, TrendingUp, TrendingDown
} from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import { signalsService } from '@/services/signalsService'
import { Card, SectionLabel, Button, SignalBadge } from '@/components/ui'
import { fmt, pctClass } from '@/utils/formatters'
import AllocationChart from '@/components/dashboard/AllocationChart'
import PriceChart from '@/components/portfolio/PriceChart'
import BenchmarkChart from '@/components/portfolio/BenchmarkChart'
import AddTransactionModal from '@/components/portfolio/AddTransactionModal'
import ImportPortfolioModal from '@/components/portfolio/ImportPortfolioModal'
import clsx from 'clsx'

// ── Inline editable target price ────────────────────────
function TargetCell({ ticker, targetPrice, currentPrice }) {
  const { setTargetPrice } = usePortfolioStore()
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(targetPrice ?? '')

  const save = () => {
    const p = parseFloat(val)
    setTargetPrice(ticker, isNaN(p) ? null : p)
    setEditing(false)
  }

  if (editing) return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="number" step="any" min="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' ? save() : e.key === 'Escape' && setEditing(false)}
        className="w-24 bg-s3 border border-buy/40 rounded-lg px-2 py-0.5 font-mono text-xs text-txt outline-none"
      />
      <button onClick={save} className="text-buy hover:text-buy/70"><Check size={11} /></button>
      <button onClick={() => setEditing(false)} className="text-muted hover:text-sell"><X size={11} /></button>
    </div>
  )

  if (!targetPrice) return (
    <button onClick={() => setEditing(true)} className="font-mono text-xs text-muted hover:text-buy transition-colors flex items-center gap-1">
      <Target size={10} />
      <span>Fijar objetivo</span>
    </button>
  )

  const distPct = ((targetPrice - currentPrice) / currentPrice) * 100
  return (
    <button onClick={() => setEditing(true)} className="text-left group">
      <div className="font-mono text-xs text-txt">{fmt.usd(targetPrice)}</div>
      <div className={clsx('font-mono text-[0.6rem]', distPct > 0 ? 'text-buy' : 'text-sell')}>
        {distPct > 0 ? '+' : ''}{distPct.toFixed(1)}% para objetivo
      </div>
    </button>
  )
}

// ── Portfolio tab / switcher ──────────────────────────────
function PortfolioTabs() {
  const { portfolios, activePortfolioId, setActive, addPortfolio, deletePortfolio, renamePortfolio } = usePortfolioStore()
  const [renaming, setRenaming] = useState(null)
  const [renameVal, setRenameVal] = useState('')

  const startRename = (p, e) => {
    e.stopPropagation()
    setRenaming(p.id)
    setRenameVal(p.name)
  }
  const saveRename = () => {
    if (renameVal.trim()) renamePortfolio(renaming, renameVal.trim())
    setRenaming(null)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {portfolios.map(p => (
        <div
          key={p.id}
          onClick={() => setActive(p.id)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all text-sm font-mono',
            p.id === activePortfolioId
              ? 'bg-buy/10 border-buy/30 text-buy'
              : 'bg-s2 border-border text-muted2 hover:text-txt hover:border-border2'
          )}
        >
          {renaming === p.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' ? saveRename() : e.key === 'Escape' && setRenaming(null)}
              onBlur={saveRename}
              onClick={e => e.stopPropagation()}
              className="bg-transparent outline-none w-28 font-mono text-sm"
            />
          ) : (
            <>
              <span>{p.name}</span>
              <button
                onClick={e => startRename(p, e)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <PenLine size={10} />
              </button>
              {portfolios.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); deletePortfolio(p.id) }}
                  className="opacity-50 hover:opacity-100 hover:text-sell transition-all"
                >
                  <X size={10} />
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <button
        onClick={() => addPortfolio(`Portafolio ${portfolios.length + 1}`)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-border text-muted2 hover:text-buy hover:border-buy/30 transition-all font-mono text-xs"
      >
        <Plus size={11} />
        Nuevo
      </button>
    </div>
  )
}

// ── RSI mini bar ─────────────────────────────────────────
function RsiMini({ value }) {
  if (value == null) return <span className="font-mono text-xs text-muted">—</span>
  const color = value < 30 ? '#00e5a0' : value > 70 ? '#f43f5e' : value > 55 ? '#facc15' : '#4f8cff'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1 bg-s3 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{value.toFixed(0)}</span>
    </div>
  )
}

// ── Señales técnicas del portafolio ───────────────────────
function PortfolioSignals({ positions }) {
  const [signals, setSignals]  = useState(null)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState(null)

  const run = async () => {
    if (!positions.length) return
    setLoading(true); setError(null)
    try {
      const entryPrices = Object.fromEntries(positions.map(p => [p.ticker, p.entryPrice]))
      const tickers     = positions.map(p => p.ticker)
      const data        = await signalsService.generateSignals(tickers, entryPrices)
      setSignals(data)
    } catch (e) {
      setError('No se pudieron obtener las señales.')
    }
    setLoading(false)
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Señales técnicas · Mis posiciones</SectionLabel>
        <Button variant="outline" size="sm" onClick={run} loading={loading} disabled={loading}>
          <Zap size={13} />
          {signals ? 'Actualizar' : 'Analizar posiciones'}
        </Button>
      </div>

      {error && <p className="font-mono text-xs text-sell">{error}</p>}

      {!signals && !loading && (
        <p className="font-mono text-xs text-muted text-center py-6">
          Presioná "Analizar posiciones" para ver RSI, momentum y señal de cada activo.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="w-4 h-4 border-2 border-buy border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-xs text-muted">Analizando indicadores…</span>
        </div>
      )}

      {signals && !loading && (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-4 gap-2 px-3 pb-1">
            {['Activo', 'Señal', 'RSI', 'Momentum 10d'].map(h => (
              <div key={h} className="font-mono text-[0.55rem] text-muted uppercase tracking-wider">{h}</div>
            ))}
          </div>
          {positions.map(pos => {
            const s = signals[pos.ticker]
            if (!s) return null
            const mom = s.indicators?.momentum10
            return (
              <div key={pos.ticker} className="grid grid-cols-4 gap-2 px-3 py-2.5 rounded-xl bg-s2 items-center">
                {/* Ticker */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pos.color }} />
                  <span className="font-mono text-xs font-medium">{pos.ticker}</span>
                </div>
                {/* Señal */}
                <div>
                  <SignalBadge signal={s.signal} />
                </div>
                {/* RSI */}
                <div>
                  <RsiMini value={s.indicators?.rsi} />
                </div>
                {/* Momentum */}
                <div className={clsx('font-mono text-xs font-medium', mom == null ? 'text-muted' : mom >= 0 ? 'text-buy' : 'text-sell')}>
                  {mom == null ? '—' : (
                    <span className="flex items-center gap-0.5">
                      {mom >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {mom >= 0 ? '+' : ''}{mom.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          {/* Análisis detallado expandible */}
          <details className="mt-2">
            <summary className="font-mono text-xs text-muted cursor-pointer hover:text-txt transition-colors px-3 py-1">
              Ver análisis detallado ↓
            </summary>
            <div className="mt-3 space-y-3">
              {positions.map(pos => {
                const s = signals[pos.ticker]
                if (!s?.analysis) return null
                return (
                  <div key={pos.ticker} className="px-3 py-3 bg-s2 rounded-xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: pos.color }} />
                      <span className="font-mono text-xs font-semibold">{pos.ticker}</span>
                      <SignalBadge signal={s.signal} />
                    </div>
                    <p className="font-mono text-[0.65rem] text-muted2 leading-relaxed">{s.analysis}</p>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </Card>
  )
}

// ── Main ────────────────────────────────────────────────
export default function PortfolioPage() {
  const {
    positions, getActive, calcPortfolioValue, calcTotalPnl, calcRealizedPnl,
    removePosition, removeTransaction, totalCapital
  } = usePortfolioStore()
  const { quotes } = useMarketStore()

  const [selected, setSelected]       = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const portfolio   = getActive()
  const value       = calcPortfolioValue(quotes)
  const pnl         = calcTotalPnl(quotes)
  const pnlPct      = totalCapital > 0 ? (pnl / totalCapital) * 100 : 0
  const cash        = portfolio?.cash ?? 0
  const realizedPnl = calcRealizedPnl()

  const txHistory   = (portfolio?.transactions ?? [])
    .filter(t => ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL'].includes(t.type))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Mi Cartera</h1>
          <div className="mt-2">
            <PortfolioTabs />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <FileUp size={14} />
            Importar broker
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={14} />
            Nueva operación
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wallet size={9} />Valor total
          </div>
          <div className="font-mono text-xl font-semibold text-txt">{fmt.usd(value)}</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">P&L no realizado</div>
          <div className={clsx('font-mono text-xl font-semibold', pctClass(pnl))}>
            {fmt.usd(pnl)}
          </div>
          <div className={clsx('font-mono text-xs', pctClass(pnlPct))}>{fmt.pct(pnlPct)}</div>
        </Card>
        {realizedPnl !== 0 && (
          <Card className="p-4">
            <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">P&L realizado</div>
            <div className={clsx('font-mono text-xl font-semibold', pctClass(realizedPnl))}>
              {fmt.usd(realizedPnl)}
            </div>
            <div className="font-mono text-[0.6rem] text-muted mt-0.5">De operaciones cerradas</div>
          </Card>
        )}
        <Card className="p-4">
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <DollarSign size={9} />Liquidez
          </div>
          <div className="font-mono text-xl font-semibold text-txt">{fmt.usd(cash)}</div>
        </Card>
        <Card className="p-4">
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">Invertido</div>
          <div className="font-mono text-xl font-semibold text-txt">{fmt.usd(totalCapital)}</div>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Positions */}
        <Card className="lg:col-span-2 p-5 space-y-2">
          <SectionLabel>Posiciones activas</SectionLabel>

          {positions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted2 text-sm">No tenés posiciones en este portafolio.</p>
              <button onClick={() => setShowModal(true)} className="text-buy font-mono text-xs mt-2 hover:underline">
                + Registrar primera compra
              </button>
            </div>
          )}

          {/* Table header */}
          {positions.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-3 pb-1">
              <div className="font-mono text-[0.55rem] text-muted uppercase tracking-wider">Activo</div>
              <div className="hidden md:block font-mono text-[0.55rem] text-muted uppercase tracking-wider">Acciones</div>
              <div className="hidden md:block font-mono text-[0.55rem] text-muted uppercase tracking-wider">Precio</div>
              <div className="font-mono text-[0.55rem] text-muted uppercase tracking-wider">Valor</div>
              <div className="font-mono text-[0.55rem] text-muted uppercase tracking-wider">P&amp;L</div>
              <div className="hidden md:block font-mono text-[0.55rem] text-muted uppercase tracking-wider">Objetivo</div>
            </div>
          )}

          {positions.map(pos => {
            const q        = quotes[pos.ticker]
            const cur      = q?.price ?? pos.entryPrice
            const posVal   = cur * pos.shares
            const posPN    = ((cur - pos.entryPrice) / pos.entryPrice) * 100
            const posPNusd = (cur - pos.entryPrice) * pos.shares
            const isSel    = selected === pos.id

            return (
              <div key={pos.id}>
                <div
                  onClick={() => setSelected(isSel ? null : pos.id)}
                  className={clsx(
                    'grid grid-cols-3 md:grid-cols-6 gap-2 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors items-center',
                    isSel ? 'bg-s3 rounded-b-none' : 'bg-s2 hover:bg-s3'
                  )}
                >
                  {/* Ticker */}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pos.color }} />
                    <div>
                      <span className="font-mono font-medium text-xs">{pos.ticker}</span>
                      <div className="font-mono text-[0.6rem] text-muted md:hidden">{pos.shares.toFixed(2)} acc.</div>
                    </div>
                  </div>
                  {/* Shares — desktop only */}
                  <div className="hidden md:block font-mono text-xs text-muted2">{pos.shares.toFixed(2)}</div>
                  {/* Price — desktop only */}
                  <div className="hidden md:block font-mono text-xs">{fmt.usd(cur)}</div>
                  {/* Value */}
                  <div className="font-mono text-xs">{fmt.usd(posVal)}</div>
                  {/* P&L */}
                  <div className={clsx('font-mono text-xs font-medium', pctClass(posPN))}>
                    {fmt.pct(posPN)}
                    <div className="text-[0.55rem] opacity-70">{fmt.usd(posPNusd)}</div>
                  </div>
                  {/* Target — desktop only */}
                  <div className="hidden md:block" onClick={e => e.stopPropagation()}>
                    <TargetCell ticker={pos.ticker} targetPrice={pos.targetPrice} currentPrice={cur} />
                  </div>
                </div>

                {/* Expandable chart */}
                {isSel && (
                  <div className="bg-s3 rounded-b-xl px-5 pt-3 pb-5 border-t border-border/40">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-muted">Entrada promedio: <span className="text-txt">{fmt.usd(pos.entryPrice)}</span></span>
                        {/* Target shown inline on mobile */}
                        <div className="md:hidden" onClick={e => e.stopPropagation()}>
                          <TargetCell ticker={pos.ticker} targetPrice={pos.targetPrice} currentPrice={cur} />
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removePosition(pos.ticker); setSelected(null) }}
                        className="flex items-center gap-1 font-mono text-xs text-muted hover:text-sell transition-colors"
                      >
                        <Trash2 size={11} />
                        Cerrar posición
                      </button>
                    </div>
                    <PriceChart ticker={pos.ticker} entryPrice={pos.entryPrice} color={pos.color} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Totals */}
          {positions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex justify-between items-center px-3">
              <span className="font-mono text-xs text-muted">Renta variable</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-txt">{fmt.usd(value - cash)}</span>
                <span className={clsx('font-mono text-sm font-medium', pctClass(pnlPct))}>
                  {fmt.pct(pnlPct)} ({fmt.usd(pnl)})
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Pie chart */}
        <AllocationChart />
      </div>

      {/* Benchmark */}
      {portfolio?.transactions?.filter(t => t.type === 'BUY').length > 0 && (
        <BenchmarkChart transactions={portfolio.transactions} />
      )}

      {/* Transaction history */}
      {txHistory.length > 0 && (
        <Card className="p-5">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between"
          >
            <SectionLabel>Historial de operaciones ({txHistory.length})</SectionLabel>
            {showHistory ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-1">
              {txHistory.map(t => {
                const isBuy  = t.type === 'BUY'
                const isSell = t.type === 'SELL'
                const isDep  = t.type === 'DEPOSIT'
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-s2 transition-colors group">
                    <span className={clsx(
                      'font-mono text-[0.6rem] px-2 py-0.5 rounded border uppercase tracking-wider w-20 text-center shrink-0',
                      isBuy  ? 'bg-buy/15 text-buy border-buy/25' :
                      isSell ? 'bg-sell/15 text-sell border-sell/25' :
                               'bg-s2 text-muted border-border'
                    )}>
                      {isBuy ? 'Compra' : isSell ? 'Venta' : isDep ? 'Depósito' : 'Retiro'}
                    </span>
                    <span className="font-mono text-xs text-muted2">{t.date}</span>
                    {(isBuy || isSell) && (
                      <>
                        <span className="font-mono text-xs font-medium text-txt">{t.ticker}</span>
                        <span className="font-mono text-xs text-muted2">{t.shares} acc. × {fmt.usd(t.price)}</span>
                        <span className={clsx('font-mono text-xs font-medium ml-auto', isBuy ? 'text-sell' : 'text-buy')}>
                          {isBuy ? '-' : '+'}{fmt.usd(t.shares * t.price)}
                        </span>
                      </>
                    )}
                    {isDep && (
                      <span className="font-mono text-xs text-buy ml-auto">+{fmt.usd(t.amount)}</span>
                    )}
                    {t.notes && <span className="font-mono text-[0.6rem] text-muted truncate max-w-[120px]">{t.notes}</span>}
                    <button
                      onClick={() => removeTransaction(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-sell transition-all ml-2 shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Señales técnicas */}
      {positions.length > 0 && <PortfolioSignals positions={positions} />}

      {showModal  && <AddTransactionModal    onClose={() => setShowModal(false)} />}
      {showImport && <ImportPortfolioModal   onClose={() => setShowImport(false)} />}
    </div>
  )
}
