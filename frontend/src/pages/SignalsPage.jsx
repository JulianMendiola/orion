import { useState } from 'react'
import { TrendingUp, RefreshCw, Activity, Target, ShieldAlert, Radar, Star } from 'lucide-react'
import { Card, SectionLabel, SignalBadge, Button } from '@/components/ui'
import { signalsService } from '@/services/signalsService'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

function RsiBar({ value }) {
  if (value == null) return <span className="font-mono text-xs text-muted">—</span>
  const pct   = Math.min(100, Math.max(0, value))
  const color = value < 30 ? '#00e5a0' : value > 70 ? '#f43f5e' : value > 55 ? '#facc15' : '#4f8cff'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-s3 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  )
}

function ConvictionBadge({ conviction }) {
  const styles = {
    ALTA:  'bg-buy/20 text-buy border-buy/30',
    MEDIA: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    BAJA:  'bg-s2 text-muted2 border-border',
  }
  return (
    <span className={clsx('font-mono text-[0.6rem] px-2 py-0.5 rounded border tracking-wider uppercase', styles[conviction] ?? styles.BAJA)}>
      Convicción {conviction ?? 'BAJA'}
    </span>
  )
}

function TargetsRow({ targets, price }) {
  if (!targets?.objetivo) return null
  const upPct  = ((targets.objetivo - price) / price * 100)
  const dnPct  = ((targets.stopLoss - price) / price * 100)
  return (
    <div className="grid grid-cols-2 gap-3 p-3 bg-s2 rounded-xl">
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Target size={10} className="text-buy" />
          <span className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Objetivo</span>
        </div>
        <div className="font-mono text-sm text-buy font-medium">{fmt.usd(targets.objetivo)}</div>
        <div className="font-mono text-[0.6rem] text-buy/70">+{upPct.toFixed(1)}% potencial</div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldAlert size={10} className="text-sell" />
          <span className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Stop-Loss</span>
        </div>
        <div className="font-mono text-sm text-sell font-medium">{fmt.usd(targets.stopLoss)}</div>
        <div className="font-mono text-[0.6rem] text-sell/70">{dnPct.toFixed(1)}% riesgo</div>
      </div>
    </div>
  )
}

function IndicatorsGrid({ ind, price }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-3 bg-s2 rounded-xl">
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">RSI 14</div>
        <RsiBar value={ind.rsi} />
      </div>
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">Momentum 10d</div>
        <span className={clsx('font-mono text-xs font-medium', ind.momentum10 >= 0 ? 'text-up' : 'text-down')}>
          {ind.momentum10 != null ? `${ind.momentum10 >= 0 ? '+' : ''}${ind.momentum10}%` : '—'}
        </span>
      </div>
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">SMA 20</div>
        <span className={clsx('font-mono text-xs font-medium', ind.sma20 && price > ind.sma20 ? 'text-up' : 'text-down')}>
          {ind.sma20 ? fmt.usd(ind.sma20) : '—'}
          {ind.sma20 && <span className="text-muted ml-1 font-normal">
            ({price > ind.sma20 ? '↑' : '↓'}{Math.abs(((price - ind.sma20) / ind.sma20) * 100).toFixed(1)}%)
          </span>}
        </span>
      </div>
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">SMA 50</div>
        <span className={clsx('font-mono text-xs font-medium', ind.sma50 && price > ind.sma50 ? 'text-up' : ind.sma50 ? 'text-down' : 'text-muted2')}>
          {ind.sma50 ? fmt.usd(ind.sma50) : '—'}
          {ind.sma50 && <span className="text-muted ml-1 font-normal">
            ({price > ind.sma50 ? '↑' : '↓'}{Math.abs(((price - ind.sma50) / ind.sma50) * 100).toFixed(1)}%)
          </span>}
        </span>
      </div>
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">SMA 200</div>
        <span className={clsx('font-mono text-xs font-medium', ind.sma200 && price > ind.sma200 ? 'text-up' : ind.sma200 ? 'text-down' : 'text-muted2')}>
          {ind.sma200 ? fmt.usd(ind.sma200) : '—'}
          {ind.sma200 && <span className="text-muted ml-1 font-normal">
            ({price > ind.sma200 ? '↑' : '↓'}{Math.abs(((price - ind.sma200) / ind.sma200) * 100).toFixed(1)}%)
          </span>}
        </span>
      </div>
      <div>
        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">Volatilidad 20d</div>
        <span className="font-mono text-xs text-txt">{ind.volatility != null ? `${ind.volatility}%` : '—'}</span>
      </div>
      {ind.weekHigh && (
        <div className="col-span-2">
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">Rango 52 semanas</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted2">{fmt.usd(ind.weekLow)}</span>
            <div className="flex-1 h-1 bg-s3 rounded-full relative">
              <div
                className="h-full bg-buy rounded-full"
                style={{ width: `${Math.min(100, ((price - ind.weekLow) / (ind.weekHigh - ind.weekLow)) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-xs text-muted2">{fmt.usd(ind.weekHigh)}</span>
          </div>
        </div>
      )}
      {ind.riskReward && (
        <div>
          <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-1">Risk/Reward</div>
          <span className={clsx('font-mono text-xs font-medium', ind.riskReward >= 2 ? 'text-buy' : 'text-muted2')}>
            1:{ind.riskReward}
          </span>
        </div>
      )}
    </div>
  )
}

function OpportunityCard({ item }) {
  const [open, setOpen] = useState(false)
  const ind = item.indicators ?? {}
  return (
    <Card className="p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-s2 flex items-center justify-center shrink-0">
            <span className="font-mono text-[0.6rem] font-medium text-muted2">{item.ticker.slice(0,3)}</span>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-sm font-medium">{item.ticker}</div>
            <div className={clsx('font-mono text-xs', pctClass(item.pct_change))}>
              {fmt.usd(item.price)} · {fmt.pct(item.pct_change)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConvictionBadge conviction={item.conviction} />
          <SignalBadge signal={item.signal} />
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <TargetsRow targets={item.targets} price={item.price} />
          <IndicatorsGrid ind={ind} price={item.price} />
          <p className="text-sm text-muted2 leading-relaxed">{item.analysis}</p>
          {item.catalyst && (
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-muted shrink-0" strokeWidth={2} />
              <span className="font-mono text-xs text-muted">{item.catalyst}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function SignalsPage() {
  const { positions } = usePortfolioStore()
  const [signals, setSignals]         = useState(null)
  const [brief, setBrief]             = useState(null)
  const [opportunities, setOpps]      = useState(null)
  const [watchlist, setWatchlist]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [loadingOpp, setLoadingOpp]   = useState(false)
  const [error, setError]             = useState(null)
  const [ts, setTs]                   = useState(null)

  const runPortfolio = async () => {
    if (positions.length === 0) { setError('Agregá posiciones a tu portafolio primero.'); return }
    setLoading(true)
    setError(null)
    try {
      const tickers = positions.map(p => p.ticker)
      const entries = Object.fromEntries(positions.map(p => [p.ticker, p.entryPrice]))
      const [result, briefResult] = await Promise.all([
        signalsService.generateSignals(tickers, entries),
        signalsService.generateBrief({ positions, totalCapital: positions.reduce((s, p) => s + p.entryPrice * p.shares, 0) }),
      ])
      setSignals(result)
      setBrief(briefResult)
      setTs(new Date().toLocaleTimeString('es-ES'))
    } catch (e) {
      setError(e.response?.data?.error ?? e.message ?? 'No se pudo conectar con el backend.')
    }
    setLoading(false)
  }

  const runRadar = async () => {
    setLoadingOpp(true)
    try {
      const exclude = positions.map(p => p.ticker)
      const result  = await signalsService.getOpportunities(exclude)
      setOpps(result.opportunities ?? [])
      setWatchlist(result.watchlist ?? [])
    } catch (e) {
      setError(e.response?.data?.error ?? e.message ?? 'Error al escanear el mercado.')
    }
    setLoadingOpp(false)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Advisor JP Morgan</h1>
          <p className="text-muted2 text-sm mt-0.5">RSI · SMA20/50/200 · Momentum · Risk/Reward</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runRadar} loading={loadingOpp} variant="ghost">
            <Radar size={14} />
            Radar del mercado
          </Button>
          <Button onClick={runPortfolio} loading={loading}>
            <Activity size={14} />
            Analizar portafolio
          </Button>
        </div>
      </div>

      {ts && <p className="font-mono text-xs text-muted">Última actualización: {ts}</p>}

      {error && (
        <div className="bg-sell/10 border border-sell/20 rounded-xl px-5 py-4">
          <p className="font-mono text-sm text-sell">{error}</p>
        </div>
      )}

      {/* Brief del portafolio */}
      {brief && (
        <Card className="p-5 border-buy/20 bg-buy/5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-buy/20 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp size={14} className="text-buy" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-medium text-buy">RESUMEN EJECUTIVO</span>
                <span className={clsx(
                  'font-mono text-[0.6rem] px-2 py-0.5 rounded border uppercase tracking-wider',
                  brief.riskLevel === 'ALTO' ? 'bg-sell/20 text-sell border-sell/30' :
                  brief.riskLevel === 'MEDIO' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                  'bg-buy/20 text-buy border-buy/30'
                )}>
                  Riesgo {brief.riskLevel}
                </span>
              </div>
              <p className="text-sm text-txt leading-relaxed">{brief.brief}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Estado inicial */}
      {!signals && !loading && !brief && !opportunities && (
        <Card className="p-12 text-center">
          <Activity size={32} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted2 text-sm">Analizá tu portafolio o escaneá el mercado para ver oportunidades.</p>
          <p className="font-mono text-xs text-muted mt-1">RSI 14 · SMA 20/50/200 · Volatilidad · Momentum 10d</p>
        </Card>
      )}

      {/* Skeleton portafolio */}
      {loading && (
        <div className="space-y-3">
          <SectionLabel>Tu portafolio</SectionLabel>
          <div className="grid grid-cols-1 gap-4">
            {positions.map(p => (
              <Card key={p.id} className="p-5 animate-pulse">
                <div className="h-5 bg-s2 rounded w-24 mb-3" />
                <div className="h-3 bg-s2 rounded w-full mb-2" />
                <div className="h-3 bg-s2 rounded w-4/5" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Señales del portafolio */}
      {signals && !loading && (
        <div className="space-y-3">
          <SectionLabel>Tu portafolio — análisis técnico</SectionLabel>
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(signals).map(([ticker, data]) => {
              const pos    = positions.find(p => p.ticker === ticker)
              const ind    = data.indicators ?? {}
              const pnlPct = pos ? ((data.price - pos.entryPrice) / pos.entryPrice * 100) : null
              const pnlUsd = pos ? (data.price - pos.entryPrice) * pos.shares : null

              return (
                <Card key={ticker} className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-s2 flex items-center justify-center">
                        <span className="font-mono text-xs font-medium text-muted2">{ticker.slice(0,3)}</span>
                      </div>
                      <div>
                        <div className="font-mono text-base font-medium">{ticker}</div>
                        <div className={clsx('font-mono text-sm', pctClass(data.pct_change))}>
                          {fmt.usd(data.price)} · {fmt.pct(data.pct_change)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ConvictionBadge conviction={data.conviction} />
                      <SignalBadge signal={data.signal} />
                    </div>
                  </div>

                  {/* P&L */}
                  {pos && pnlPct !== null && (
                    <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-s2 rounded-xl">
                      <div>
                        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Entrada</div>
                        <div className="font-mono text-sm">{fmt.usd(pos.entryPrice)}</div>
                      </div>
                      <div>
                        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">P&L %</div>
                        <div className={clsx('font-mono text-sm font-medium', pctClass(pnlPct))}>
                          {fmt.pct(pnlPct)}
                        </div>
                      </div>
                      <div>
                        <div className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">P&L $</div>
                        <div className={clsx('font-mono text-sm font-medium', pctClass(pnlUsd))}>
                          {fmt.usd(pnlUsd)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Targets */}
                  <div className="mb-4">
                    <TargetsRow targets={data.targets} price={data.price} />
                  </div>

                  {/* Indicadores */}
                  <div className="mb-4">
                    <IndicatorsGrid ind={ind} price={data.price} />
                  </div>

                  {/* Análisis */}
                  <p className="text-sm text-muted2 leading-relaxed mb-2">{data.analysis}</p>
                  {data.catalyst && (
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-muted shrink-0" strokeWidth={2} />
                      <span className="font-mono text-xs text-muted">{data.catalyst}</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Skeleton radar */}
      {loadingOpp && (
        <div className="space-y-3">
          <SectionLabel>Escaneando el mercado…</SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-s2 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-s2 rounded w-20" />
                    <div className="h-3 bg-s2 rounded w-32" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <p className="font-mono text-xs text-muted text-center">Analizando 30 activos con indicadores técnicos…</p>
        </div>
      )}

      {/* Oportunidades del mercado */}
      {opportunities && !loadingOpp && (
        <div className="space-y-3">
          <SectionLabel>
            <Star size={12} className="inline mr-1.5 text-buy" strokeWidth={2} />
            Mejores oportunidades de compra
          </SectionLabel>
          {opportunities.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted2 text-sm">No se detectaron señales de compra en este momento.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {opportunities.map(item => (
                <OpportunityCard key={item.ticker} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist del radar */}
      {watchlist && watchlist.length > 0 && !loadingOpp && (
        <div className="space-y-3">
          <SectionLabel>A vigilar — tendencia positiva</SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            {watchlist.map(item => (
              <OpportunityCard key={item.ticker} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
