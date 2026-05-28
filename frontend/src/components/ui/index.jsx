import clsx from 'clsx'

// ─── Card ───────────────────────────────────────────────
export function Card({ children, className, ...props }) {
  return (
    <div className={clsx('card', className)} {...props}>
      {children}
    </div>
  )
}

// ─── Badge / Signal ──────────────────────────────────────
const SIGNAL_MAP = {
  COMPRAR:      'badge-buy',
  MANTENER:     'badge-hold',
  'PRECAUCIÓN': 'badge-sell',
  ESPERAR:      'badge-wait',
}
const SIGNAL_EMOJI = { COMPRAR: '🟢', MANTENER: '🟡', 'PRECAUCIÓN': '🔴', ESPERAR: '⚪' }

export function SignalBadge({ signal = 'ESPERAR' }) {
  return (
    <span className={SIGNAL_MAP[signal] ?? 'badge-wait'}>
      {SIGNAL_EMOJI[signal] ?? '⚪'} {signal}
    </span>
  )
}

// ─── Button ──────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary:  'bg-buy text-bg hover:opacity-90 active:scale-95',
    ghost:    'bg-transparent text-muted2 hover:text-txt hover:bg-s2',
    danger:   'bg-sell/10 text-sell hover:bg-sell/20 border border-sell/20',
    outline:  'border border-border text-muted2 hover:border-border2 hover:text-txt',
  }
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2', lg: 'text-base px-5 py-2.5' }

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={loading} {...props}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ─── Skeleton ────────────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />
}

export function SkeletonLine({ w = 'full', h = 4 }) {
  return <div className={clsx('skeleton rounded', `w-${w} h-${h}`)} />
}

// ─── Section Label ───────────────────────────────────────
export function SectionLabel({ children }) {
  return <p className="section-label mb-3">{children}</p>
}

// ─── Stat cell ───────────────────────────────────────────
export function StatCell({ label, value, subValue, valueClass = '' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted">{label}</span>
      <span className={clsx('font-mono text-sm font-medium', valueClass || 'text-txt')}>{value}</span>
      {subValue && <span className="font-mono text-[0.6rem] text-muted">{subValue}</span>}
    </div>
  )
}
