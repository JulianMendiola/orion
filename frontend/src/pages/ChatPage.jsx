import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Trash2 } from 'lucide-react'
import axios from 'axios'
import { Card } from '@/components/ui'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useMarketStore } from '@/store/marketStore'
import clsx from 'clsx'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
  timeout: 60000,
})

const SUGERENCIAS = [
  '¿Cómo viene mi portfolio?',
  '¿Conviene comprar dólar MEP hoy?',
  '¿Qué significa el riesgo país actual?',
  '¿Debería rebalancear mi cartera?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const { positions, cash } = usePortfolioStore()
  const { quotes } = useMarketStore()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const portfolio = {
        positions: positions.map(p => ({
          ticker: p.ticker,
          shares: p.shares,
          entryPrice: p.entryPrice,
          currentPrice: quotes[p.ticker]?.price ?? null,
        })),
        cash,
      }
      const { data } = await api.post('/chat', { messages: next, portfolio })
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Error de conexión. Probá de nuevo.'
      setMessages([...next, { role: 'assistant', content: `⚠️ ${msg}` }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-buy" /> Orion Chat
          </h1>
          <p className="text-muted2 text-sm mt-0.5">Tu analista con contexto de tu cartera y el mercado argentino</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-muted2 hover:text-sell transition-colors">
            <Trash2 size={15} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Sparkles size={28} className="text-buy/50" />
              <p className="text-muted2 text-sm">Preguntale a Orion sobre tu cartera, el dólar o el mercado.</p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {SUGERENCIAS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs font-mono px-3 py-1.5 rounded-full border border-border text-muted2 hover:text-buy hover:border-buy/40 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user' ? 'bg-buy/15 text-txt' : 'bg-s2 text-muted2'
              )}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-s2 rounded-2xl px-4 py-2.5">
                <span className="font-mono text-xs text-muted animate-pulse">Orion está pensando…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Escribí tu pregunta…"
            className="flex-1 bg-s2 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-buy/40 placeholder:text-muted"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="px-4 rounded-xl bg-buy/15 text-buy hover:bg-buy/25 disabled:opacity-40 transition-all"
          >
            <Send size={16} strokeWidth={1.8} />
          </button>
        </div>
      </Card>
    </div>
  )
}
