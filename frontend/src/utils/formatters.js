import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const fmt = {
  usd: (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n ?? 0),

  pct: (n, showPlus = true) => {
    if (n == null) return '—'
    const s = (n >= 0 && showPlus ? '+' : '') + n.toFixed(2) + '%'
    return s
  },

  compact: (n) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0),

  date: (d) => format(new Date(d), "d MMM yyyy", { locale: es }),

  time: (d) => format(new Date(d), "HH:mm"),
}

// Alias for topbar
export const formatPct = fmt.pct

export function pctClass(n) {
  if (!n && n !== 0) return 'num-flat'
  return n > 0 ? 'num-up' : n < 0 ? 'num-down' : 'num-flat'
}

export function signalClass(signal) {
  return {
    COMPRAR:    'badge-buy',
    MANTENER:   'badge-hold',
    'PRECAUCIÓN': 'badge-sell',
    ESPERAR:    'badge-wait',
  }[signal] ?? 'badge-wait'
}

export function signalEmoji(signal) {
  return { COMPRAR: '🟢', MANTENER: '🟡', 'PRECAUCIÓN': '🔴', ESPERAR: '⚪' }[signal] ?? '⚪'
}
