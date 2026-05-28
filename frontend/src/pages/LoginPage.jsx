import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'
import { TrendingUp, Zap, Newspaper, BarChart2, Eye } from 'lucide-react'

const FEATURES = [
  { icon: BarChart2, text: 'Portafolio multi-cartera con P&L en tiempo real' },
  { icon: TrendingUp, text: 'Benchmark vs SPY y QQQ con cada compra' },
  { icon: Zap,       text: 'Señales técnicas RSI · SMA20/50/200 · Momentum' },
  { icon: Newspaper, text: 'Noticias de Yahoo Finance + fuentes argentinas' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState('login')
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const { signIn, signUp, enterDemo } = useAuthStore()
  const navigate                      = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate('/dashboard')
      } else {
        await signUp(email, password)
        // Auto sign-in — navigate directly
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message
      setError(msg)
    }
    setLoading(false)
  }

  const handleDemo = () => { enterDemo(); navigate('/dashboard') }

  return (
    <div className="min-h-screen bg-bg grain flex flex-col md:flex-row">
      {/* Left panel — branding (desktop only) */}
      <div className="hidden md:flex flex-col justify-between w-[420px] shrink-0 bg-surface border-r border-border p-10">
        <div>
          <span className="font-display font-extrabold text-3xl tracking-tight">
            ORI<span className="text-buy">ON</span>
          </span>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mt-1">Investment Intelligence</p>

          <div className="mt-12 space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-buy/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-buy" strokeWidth={2} />
                </div>
                <p className="font-mono text-sm text-muted2 leading-snug">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[0.6rem] text-muted">
          Datos de Yahoo Finance · Análisis técnico propio · Sin costos de API
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="text-center mb-8 md:hidden">
            <span className="font-display font-extrabold text-4xl tracking-tight">
              ORI<span className="text-buy">ON</span>
            </span>
            <p className="text-muted2 text-sm mt-1 font-mono">Investment Intelligence</p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-7 shadow-2xl">
            <h2 className="font-display font-bold text-xl mb-1">
              {mode === 'login' ? 'Bienvenido' : 'Crear cuenta'}
            </h2>
            <p className="font-mono text-xs text-muted mb-6">
              {mode === 'login' ? 'Ingresá para ver tu portafolio' : 'Gratis, sin tarjeta de crédito'}
            </p>

            <form onSubmit={handle} className="space-y-4">
              <div>
                <label className="font-mono text-[0.65rem] uppercase tracking-wider text-muted block mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                  className="w-full bg-s2 border border-border text-txt font-mono text-sm px-3 py-2.5 rounded-xl outline-none focus:border-buy/50 transition-colors placeholder:text-muted"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="font-mono text-[0.65rem] uppercase tracking-wider text-muted block mb-1.5">Contraseña</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-s2 border border-border text-txt font-mono text-sm px-3 py-2.5 rounded-xl outline-none focus:border-buy/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error   && <p className="font-mono text-xs text-sell bg-sell/10 px-3 py-2 rounded-lg">{error}</p>}
              {success && <p className="font-mono text-xs text-buy  bg-buy/10  px-3 py-2 rounded-lg">{success}</p>}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[0.6rem] text-muted">o</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Demo mode */}
            <button
              onClick={handleDemo}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border font-mono text-sm text-muted2 hover:text-txt hover:border-border2 transition-all"
            >
              <Eye size={14} strokeWidth={1.8} />
              Explorar en modo demo
            </button>

            <p className="mt-4 text-center font-mono text-xs text-muted">
              {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tenés cuenta? '}
              <button
                onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); setSuccess(null) }}
                className="text-buy hover:underline"
              >
                {mode === 'login' ? 'Registrarse gratis' : 'Iniciar sesión'}
              </button>
            </p>
          </div>

          <p className="text-center font-mono text-[0.6rem] text-muted mt-4">
            El modo demo no guarda datos. Creá una cuenta para persistir tu portafolio.
          </p>
        </div>
      </div>
    </div>
  )
}
