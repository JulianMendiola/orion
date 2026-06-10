import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Briefcase,
  Zap, Newspaper, Settings, LogOut, Bell, FlaskConical, Eye, Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAlertsStore } from '@/store/alertsStore'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/markets',   icon: TrendingUp,      label: 'Mercados'   },
  { to: '/portfolio', icon: Briefcase,        label: 'Cartera'    },
  { to: '/signals',   icon: Zap,              label: 'Señales'    },
  { to: '/news',      icon: Newspaper,        label: 'Noticias'   },
  { to: '/alerts',    icon: Bell,             label: 'Alertas', badge: true },
  { to: '/backtest',  icon: FlaskConical,     label: 'Backtest'   },
  { to: '/chat',      icon: Sparkles,         label: 'Chat IA'    },
]

export default function Sidebar() {
  const { user, demo, signOut } = useAuthStore()
  const { unacknowledged }      = useAlertsStore()
  const navigate                = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }
  const handleExitDemo = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-surface border-r border-border h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <span className="font-display font-extrabold text-2xl tracking-tight">
          ORI<span className="text-buy">ON</span>
        </span>
        <p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted mt-0.5">
          Investment Intelligence
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-buy/10 text-buy'
                : 'text-muted2 hover:text-txt hover:bg-s2'
            )}
          >
            <div className="relative">
              <Icon size={16} strokeWidth={1.8} />
              {badge && unacknowledged > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-buy text-bg text-[0.45rem] font-mono font-bold flex items-center justify-center">
                  {unacknowledged > 9 ? '9+' : unacknowledged}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        {!demo && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted2 hover:text-txt hover:bg-s2 transition-all"
          >
            <Settings size={16} strokeWidth={1.8} />
            Configuración
          </NavLink>
        )}
        <button
          onClick={demo ? handleExitDemo : handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted2 hover:text-sell hover:bg-sell/5 transition-all"
        >
          <LogOut size={16} strokeWidth={1.8} />
          {demo ? 'Salir del demo' : 'Cerrar sesión'}
        </button>

        {/* User chip */}
        <div className="mt-3 px-3 py-2 bg-s2 rounded-xl flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium ${demo ? 'bg-muted/20 text-muted2' : 'bg-buy/20 text-buy'}`}>
            {demo ? <Eye size={13} strokeWidth={1.8} /> : (user?.email?.[0]?.toUpperCase() ?? 'U')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-txt truncate font-medium">
              {demo ? 'Modo demo' : (user?.email ?? '')}
            </span>
            <span className="text-[0.6rem] text-muted font-mono">
              {demo ? 'Sin cuenta · datos locales' : 'Pro'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
