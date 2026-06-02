import { useState } from 'react'
import {
  Bell, BellOff, Trash2, Plus, Check, RefreshCw,
  DollarSign, TrendingUp, TrendingDown, Activity,
  Zap, ShieldAlert, Target, Radar,
} from 'lucide-react'
import { Card, SectionLabel, Button } from '@/components/ui'
import { useAlertsStore } from '@/store/alertsStore'
import { useMarketStore } from '@/store/marketStore'
import { signalsService } from '@/services/signalsService'
import { requestNotificationPermission } from '@/utils/notifications'
import { fmt, pctClass } from '@/utils/formatters'
import clsx from 'clsx'

// ── Estilos por tipo de smart alert ──────────────────────
const SMART_STYLES = {
  BUY_OVERSOLD: { ring: 'border-buy/30 bg-buy/5',          dot: 'bg-buy/20 text-buy',         Icon: TrendingUp  },
  BUY_DIP:      { ring: 'border-buy/25 bg-buy/5',          dot: 'bg-buy/20 text-buy',         Icon: TrendingDown },
  RECOVERY:     { ring: 'border-blue-500/25 bg-blue-500/5', dot: 'bg-blue-500/20 text-blue-400', Icon: TrendingUp  },
  NEAR_52LOW:   { ring: 'border-purple-500/25 bg-purple-500/5', dot: 'bg-purple-500/20 text-purple-400', Icon: Target },
  TAKE_PROFIT:  { ring: 'border-yellow-500/25 bg-yellow-500/5', dot: 'bg-yellow-500/20 text-yellow-400', Icon: ShieldAlert },
  MOMENTUM:     { ring: 'border-indigo-500/25 bg-indigo-500/5', dot: 'bg-indigo-500/20 text-indigo-400', Icon: Zap },
}

const ACTION_STYLE = {
  COMPRAR:    'bg-buy/20 text-buy border-buy/30',
  PRECAUCIÓN: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  MANTENER:   'bg-s2 text-muted2 border-border',
}

const CONVICTION_STYLE = {
  ALTA:  'text-buy',
  MEDIA: 'text-yellow-400',
  BAJA:  'text-muted',
}

// ── Smart Alert Card ──────────────────────────────────────
function SmartAlertCard({ alert }) {
  const st = SMART_STYLES[alert.type] ?? SMART_STYLES.MOMENTUM
  const { Icon } = st
  const ind = alert.indicators ?? {}

  return (
    <Card className={clsx('p-4 border transition-colors', st.ring)}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', st.dot)}>
          <Icon size={14} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm font-bold">{alert.ticker}</span>
            <span className={clsx('font-mono text-[0.6rem] px-2 py-0.5 rounded border uppercase tracking-wider', ACTION_STYLE[alert.action] ?? ACTION_STYLE.MANTENER)}>
              {alert.action}
            </span>
            <span className={clsx('font-mono text-[0.6rem] uppercase tracking-wider', CONVICTION_STYLE[alert.conviction] ?? 'text-muted')}>
              {alert.conviction}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-muted2 leading-snug mb-2.5">{alert.description}</p>

          {/* Indicator chips */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {ind.rsi != null && (
              <span className={clsx('font-mono text-[0.6rem]',
                ind.rsi < 32 ? 'text-buy' : ind.rsi > 70 ? 'text-sell' : 'text-muted2'
              )}>
                RSI {ind.rsi.toFixed(0)}
              </span>
            )}
            {ind.sma50 != null && (
              <span className="font-mono text-[0.6rem] text-muted">SMA50 {fmt.usd(ind.sma50)}</span>
            )}
            {ind.sma200 != null && (
              <span className="font-mono text-[0.6rem] text-muted">SMA200 {fmt.usd(ind.sma200)}</span>
            )}
            {ind.momentum10 != null && (
              <span className={clsx('font-mono text-[0.6rem]', ind.momentum10 >= 0 ? 'text-buy' : 'text-sell')}>
                Momentum {ind.momentum10 >= 0 ? '+' : ''}{ind.momentum10.toFixed(1)}%
              </span>
            )}
            {ind.weekLow != null && (
              <span className="font-mono text-[0.6rem] text-muted">Mín 52s {fmt.usd(ind.weekLow)}</span>
            )}
            {ind.weekHigh != null && alert.type === 'TAKE_PROFIT' && (
              <span className="font-mono text-[0.6rem] text-muted">Máx 52s {fmt.usd(ind.weekHigh)}</span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-medium">{fmt.usd(alert.price)}</div>
          <div className={clsx('font-mono text-xs', pctClass(alert.pct_change))}>
            {alert.pct_change >= 0 ? '+' : ''}{alert.pct_change?.toFixed(2)}%
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Smart Alerts Skeleton ─────────────────────────────────
function ScanSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-s2 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 bg-s2 rounded w-14" />
                <div className="h-4 bg-s2 rounded w-20" />
              </div>
              <div className="h-3 bg-s2 rounded w-full" />
              <div className="h-3 bg-s2 rounded w-3/4" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 bg-s2 rounded w-16" />
              <div className="h-3 bg-s2 rounded w-12" />
            </div>
          </div>
        </Card>
      ))}
      <p className="font-mono text-xs text-muted text-center pt-1">
        Analizando {30} activos — RSI · SMA · Momentum · 52w range…
      </p>
    </div>
  )
}

// ── Tipos de alerta manual ────────────────────────────────
const ALERT_TYPES = [
  { id: 'precio', label: 'Precio',     Icon: DollarSign, desc: 'Cruza un precio exacto' },
  { id: 'pct',    label: '% del día',  Icon: TrendingUp, desc: 'Sube o baja más de X% hoy' },
  { id: 'rsi',    label: 'RSI',        Icon: Activity,   desc: 'RSI en zona extrema' },
]

// ── Formulario alerta manual ──────────────────────────────
function AddAlertForm({ onClose, prefillTicker = '' }) {
  const { addAlert }   = useAlertsStore()
  const [tab, setTab]  = useState('precio')
  const [ticker, setTicker]       = useState(prefillTicker)
  const [direction, setDirection] = useState('above')
  const [value, setValue]         = useState('')

  const submit = (e) => {
    e.preventDefault()
    const t = ticker.toUpperCase().trim()
    const v = parseFloat(value)
    if (!t || isNaN(v) || v <= 0) return
    requestNotificationPermission()
    if (tab === 'precio')      addAlert({ ticker: t, type: direction === 'above' ? 'above' : 'below',       targetPrice: v })
    else if (tab === 'pct')    addAlert({ ticker: t, type: direction === 'above' ? 'pct_above' : 'pct_below', threshold: v })
    else if (tab === 'rsi')    addAlert({ ticker: t, type: direction === 'above' ? 'rsi_above' : 'rsi_below', threshold: v })
    onClose()
  }

  const ph = {
    precio: { label: 'Precio ($)',  placeholder: '150.00', hint: `Avisa cuando el precio ${direction === 'above' ? 'suba a' : 'caiga a'} este valor` },
    pct:    { label: 'Umbral (%)',  placeholder: '3.0',    hint: `Avisa si ${direction === 'above' ? 'sube' : 'cae'} más de este % en el día` },
    rsi:    { label: 'RSI umbral',  placeholder: direction === 'above' ? '70' : '30', hint: direction === 'above' ? 'Sobrecompra — RSI ≥ umbral' : 'Sobreventa — RSI ≤ umbral' },
  }[tab]

  return (
    <Card className="p-5 border-buy/20">
      <h3 className="font-mono text-sm font-medium mb-4 flex items-center gap-2">
        <Bell size={13} className="text-buy" />
        Nueva alerta manual
      </h3>

      {/* Tipo */}
      <div className="flex gap-1.5 mb-4">
        {ALERT_TYPES.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => { setTab(id); setValue('') }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all',
              tab === id ? 'bg-buy/20 text-buy border border-buy/30' : 'bg-s2 text-muted2 border border-border hover:text-txt'
            )}>
            <Icon size={11} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1">Activo</label>
          <input
            type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL, META, BTC-USD…" autoFocus={!prefillTicker}
            className="w-full bg-s2 border border-border text-txt text-sm font-mono px-3 py-2 rounded-lg outline-none focus:border-buy/50 placeholder:text-muted"
          />
        </div>

        <div>
          <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1">Condición</label>
          <div className="flex gap-2">
            {[
              { val: 'above', label: tab === 'rsi' ? '↑ RSI ≥ umbral (sobrecompra)' : tab === 'pct' ? '↑ Sube más de' : '↑ Sube a' },
              { val: 'below', label: tab === 'rsi' ? '↓ RSI ≤ umbral (sobreventa)'  : tab === 'pct' ? '↓ Cae más de'  : '↓ Cae a'  },
            ].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => setDirection(val)}
                className={clsx(
                  'flex-1 py-2 rounded-lg font-mono text-xs transition-all',
                  direction === val
                    ? val === 'above' ? 'bg-buy/20 text-buy border border-buy/30' : 'bg-sell/20 text-sell border border-sell/30'
                    : 'bg-s2 text-muted2 border border-border hover:text-txt'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider block mb-1">{ph.label}</label>
          <input
            type="number" value={value} onChange={e => setValue(e.target.value)}
            placeholder={ph.placeholder} step={tab === 'precio' ? '0.01' : '0.1'} min="0"
            className="w-full bg-s2 border border-border text-txt text-sm font-mono px-3 py-2 rounded-lg outline-none focus:border-buy/50 placeholder:text-muted"
          />
          <p className="font-mono text-[0.6rem] text-muted mt-1">{ph.hint}</p>
        </div>

        {tab === 'rsi' && (
          <div className="bg-s2 rounded-xl px-3 py-2.5">
            <p className="font-mono text-[0.6rem] text-muted">RSI se verifica cada 5 min · Sobrecompra típica = 70 · Sobreventa = 30</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1"><Plus size={14} />Crear alerta</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        </div>
      </form>
    </Card>
  )
}

// ── Fila de alerta manual ─────────────────────────────────
function AlertRow({ alert }) {
  const { removeAlert, resetAlert } = useAlertsStore()
  const { quotes }                  = useMarketStore()
  const quote        = quotes[alert.ticker]
  const currentPrice = quote?.price
  const currentPct   = quote?.pct

  const typeTag = {
    above:     { label: `↑ ${fmt.usd(alert.targetPrice)}`,   color: 'buy'    },
    below:     { label: `↓ ${fmt.usd(alert.targetPrice)}`,   color: 'sell'   },
    pct_above: { label: `↑ +${alert.threshold}% día`,        color: 'buy'    },
    pct_below: { label: `↓ -${alert.threshold}% día`,        color: 'sell'   },
    rsi_above: { label: `RSI ≥ ${alert.threshold}`,          color: 'purple' },
    rsi_below: { label: `RSI ≤ ${alert.threshold}`,          color: 'buy'    },
  }[alert.type] ?? { label: alert.type, color: 'muted' }

  const colorCls = {
    buy:    'bg-buy/15 text-buy border-buy/25',
    sell:   'bg-sell/15 text-sell border-sell/25',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    muted:  'bg-s2 text-muted2 border-border',
  }[typeTag.color]

  let distInfo = null
  if ((alert.type === 'above' || alert.type === 'below') && currentPrice && !alert.triggered) {
    const d = (alert.targetPrice - currentPrice) / currentPrice * 100
    distInfo = { pct: d, close: Math.abs(d) < 5 }
  }
  if ((alert.type === 'pct_above' || alert.type === 'pct_below') && currentPct != null && !alert.triggered) {
    const dir = alert.type === 'pct_above' ? 1 : -1
    distInfo = { pct: dir * alert.threshold - currentPct, close: Math.abs(dir * alert.threshold - currentPct) < 1 }
  }

  return (
    <Card className={clsx('p-4 transition-colors', alert.triggered ? 'border-buy/30 bg-buy/5' : '')}>
      <div className="flex items-center gap-3">
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', alert.triggered ? 'bg-buy/20' : 'bg-s2')}>
          {alert.triggered ? <Check size={14} className="text-buy" /> : <Bell size={14} className="text-muted2" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{alert.ticker}</span>
            <span className={clsx('font-mono text-[0.6rem] px-2 py-0.5 rounded border', colorCls)}>{typeTag.label}</span>
            {alert.triggered && (
              <span className="font-mono text-[0.6rem] px-2 py-0.5 rounded border bg-buy/20 text-buy border-buy/30">DISPARADA</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {currentPrice && (
              <span className="font-mono text-xs text-muted2">
                {fmt.usd(currentPrice)}
                {currentPct != null && (
                  <span className={clsx('ml-1', pctClass(currentPct))}>
                    ({currentPct >= 0 ? '+' : ''}{currentPct.toFixed(2)}%)
                  </span>
                )}
              </span>
            )}
            {distInfo && (
              <span className={clsx('font-mono text-xs', distInfo.close ? 'text-yellow-400' : 'text-muted')}>
                {distInfo.pct > 0 ? '+' : ''}{distInfo.pct.toFixed(1)}% para objetivo
              </span>
            )}
            {alert.triggeredAt && (
              <span className="font-mono text-[0.6rem] text-muted">
                {new Date(alert.triggeredAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {alert.triggered && (
            <button onClick={() => resetAlert(alert.id)} title="Reactivar"
              className="text-muted hover:text-buy transition-colors p-1.5 rounded-lg hover:bg-buy/10">
              <RefreshCw size={12} strokeWidth={1.8} />
            </button>
          )}
          <button onClick={() => removeAlert(alert.id)}
            className="text-muted hover:text-sell transition-colors p-1.5 rounded-lg hover:bg-sell/10">
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────
export default function AlertsPage() {
  const { alerts, clearTriggered, acknowledgeAll } = useAlertsStore()
  const [showForm, setShowForm]         = useState(false)
  const [smartAlerts, setSmartAlerts]   = useState(null)
  const [scanning, setScanning]         = useState(false)
  const [scanTs, setScanTs]             = useState(null)
  const [scanError, setScanError]       = useState(null)

  const runScan = async () => {
    setScanning(true)
    setScanError(null)
    try {
      const data = await signalsService.getSmartAlerts()
      setSmartAlerts(data.alerts ?? [])
      setScanTs(data.ts)
    } catch (e) {
      setScanError(e.response?.data?.error ?? e.message ?? 'No se pudo conectar con el backend.')
      setSmartAlerts([])
    }
    setScanning(false)
  }

  const active    = alerts.filter(a => !a.triggered)
  const triggered = alerts.filter(a =>  a.triggered)

  const openForm = () => { setShowForm(true); acknowledgeAll() }

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ── SEÑALES DEL MERCADO ── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight">Alertas</h1>
            <p className="text-muted2 text-sm mt-0.5">
              Señales automáticas basadas en RSI · Momentum · Caídas de calidad · Breakouts
            </p>
          </div>
          <Button onClick={runScan} loading={scanning} variant="ghost" className="shrink-0">
            <Radar size={14} />
            Escanear mercado
          </Button>
        </div>

        {/* Estado inicial */}
        {!smartAlerts && !scanning && (
          <Card className="p-10 text-center border-dashed">
            <Radar size={28} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-muted2 text-sm font-medium">Escaneá el mercado en tiempo real</p>
            <p className="font-mono text-xs text-muted mt-1 mb-4">
              Analiza 30 activos · RSI · SMA20/50/200 · Momentum · Rango 52 semanas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-sm mx-auto mb-5">
              {[
                { label: 'Sobreventa extrema', desc: 'RSI < 32 + sobre SMA50', color: 'text-buy' },
                { label: 'Comprar la caída',   desc: 'Blue-chip cae 4%+ hoy',  color: 'text-buy' },
                { label: 'Recuperación',       desc: 'RSI saliendo de zona',   color: 'text-blue-400' },
                { label: 'Zona histórica',     desc: 'Cerca de mínimo anual',  color: 'text-purple-400' },
                { label: 'Tomar ganancias',    desc: 'RSI alto en máximos',    color: 'text-yellow-400' },
                { label: 'Breakout',           desc: 'Momentum > 10% en 10d',  color: 'text-indigo-400' },
              ].map(({ label, desc, color }) => (
                <div key={label} className="bg-s2 rounded-xl p-2.5 text-left">
                  <div className={clsx('font-mono text-[0.6rem] font-medium uppercase tracking-wider', color)}>{label}</div>
                  <div className="font-mono text-[0.6rem] text-muted mt-0.5">{desc}</div>
                </div>
              ))}
            </div>
            <Button onClick={runScan} size="sm">
              <Radar size={13} />
              Escanear ahora
            </Button>
          </Card>
        )}

        {/* Escaneando */}
        {scanning && <ScanSkeleton />}

        {/* Error */}
        {scanError && !scanning && (
          <Card className="p-5 border-sell/20 bg-sell/5">
            <p className="font-mono text-sm text-sell">{scanError}</p>
          </Card>
        )}

        {/* Resultados */}
        {smartAlerts && !scanning && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>
                {smartAlerts.length > 0
                  ? `${smartAlerts.length} señal${smartAlerts.length !== 1 ? 'es' : ''} detectada${smartAlerts.length !== 1 ? 's' : ''}`
                  : 'Sin señales destacadas'
                }
              </SectionLabel>
              {scanTs && (
                <span className="font-mono text-xs text-muted">
                  {new Date(scanTs).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  <button onClick={runScan} className="ml-2 text-muted hover:text-buy transition-colors">
                    <RefreshCw size={10} strokeWidth={2} />
                  </button>
                </span>
              )}
            </div>

            {smartAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted2 text-sm">El mercado opera en equilibrio.</p>
                <p className="font-mono text-xs text-muted mt-1">No hay señales de entrada ni salida prioritarias en este momento.</p>
              </Card>
            ) : (
              <>
                {/* Agrupar por acción */}
                {['high', 'warning', 'medium', 'info'].map(sev => {
                  const group = smartAlerts.filter(a => a.severity === sev)
                  if (!group.length) return null
                  const groupLabel = { high: 'Alta convicción', warning: 'Precaución', medium: 'Oportunidades', info: 'A vigilar' }[sev]
                  return (
                    <div key={sev} className="space-y-2">
                      <div className="font-mono text-[0.65rem] text-muted uppercase tracking-widest px-1">{groupLabel}</div>
                      {group.map((alert, i) => <SmartAlertCard key={`${alert.ticker}-${i}`} alert={alert} />)}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── MIS ALERTAS MANUALES ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg tracking-tight">Mis alertas manuales</h2>
            <p className="text-muted2 text-xs mt-0.5">Precio cada 30 seg · RSI cada 5 min</p>
          </div>
          <Button onClick={openForm} size="sm">
            <Plus size={13} />
            Nueva alerta
          </Button>
        </div>

        {showForm && <AddAlertForm onClose={() => setShowForm(false)} />}

        {alerts.length === 0 && !showForm && (
          <Card className="p-8 text-center">
            <BellOff size={24} className="text-muted mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-muted2 text-sm">Sin alertas manuales configuradas.</p>
            <p className="font-mono text-xs text-muted mt-1">
              Configurá alertas por precio exacto, % variación del día o RSI técnico.
            </p>
            <button onClick={openForm} className="mt-3 font-mono text-xs text-buy hover:underline">
              + Crear primera alerta
            </button>
          </Card>
        )}

        {active.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>Activas ({active.length})</SectionLabel>
            {active.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
        )}

        {triggered.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Disparadas ({triggered.length})</SectionLabel>
              <button onClick={clearTriggered} className="font-mono text-xs text-muted hover:text-sell transition-colors">
                Limpiar todas
              </button>
            </div>
            {triggered.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
        )}
      </section>
    </div>
  )
}
