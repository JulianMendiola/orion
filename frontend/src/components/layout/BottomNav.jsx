import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Briefcase, Zap,
  Newspaper, Bell, FlaskConical, X, MoreHorizontal
} from 'lucide-react'
import { useAlertsStore } from '@/store/alertsStore'
import clsx from 'clsx'

const PRIMARY = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio'   },
  { to: '/markets',   icon: TrendingUp,      label: 'Mercados' },
  { to: '/portfolio', icon: Briefcase,        label: 'Cartera'  },
  { to: '/signals',   icon: Zap,              label: 'Señales'  },
]

const MORE = [
  { to: '/news',     icon: Newspaper,     label: 'Noticias'  },
  { to: '/alerts',   icon: Bell,          label: 'Alertas'   },
  { to: '/backtest', icon: FlaskConical,  label: 'Backtest'  },
]

export default function BottomNav() {
  const { unacknowledged, acknowledgeAll } = useAlertsStore()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-surface border-t border-border rounded-t-2xl px-4 pt-3 pb-safe-4 z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3 pb-2">
              {MORE.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) => clsx(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all',
                    isActive ? 'bg-buy/10 text-buy' : 'bg-s2 text-muted2'
                  )}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span className="font-mono text-[0.6rem] uppercase tracking-wider">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border md:hidden">
        <div className="flex items-stretch h-14">
          {PRIMARY.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all',
                isActive ? 'text-buy' : 'text-muted2'
              )}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span className="font-mono text-[0.5rem] uppercase tracking-wider">{label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(m => !m)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted2 relative"
          >
            {showMore
              ? <X size={19} strokeWidth={1.8} />
              : <MoreHorizontal size={19} strokeWidth={1.8} />
            }
            <span className="font-mono text-[0.5rem] uppercase tracking-wider">Más</span>
            {unacknowledged > 0 && (
              <span className="absolute top-1.5 right-4 w-3.5 h-3.5 rounded-full bg-buy text-bg text-[0.45rem] font-mono font-bold flex items-center justify-center">
                {unacknowledged > 9 ? '9+' : unacknowledged}
              </span>
            )}
          </button>
        </div>
        {/* iOS safe area */}
        <div className="h-safe-bottom bg-surface" />
      </nav>

      {/* Spacer so content doesn't hide behind bottom nav */}
      <div className="h-14 md:hidden" />
    </>
  )
}
