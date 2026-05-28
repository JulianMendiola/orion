import { useState, useEffect } from 'react'
import { ExternalLink, RefreshCw, Newspaper } from 'lucide-react'
import { Card, SectionLabel, Skeleton } from '@/components/ui'
import { usePortfolioStore } from '@/store/portfolioStore'
import axios from 'axios'
import clsx from 'clsx'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000' })

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Math.floor((Date.now() / 1000) - ts)
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

export default function NewsPageComponent() {
  const { positions } = usePortfolioStore()
  const [news, setNews]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('todos')

  const tickers = positions.map(p => p.ticker)
  const allTickers = [...new Set([...tickers, 'SPY', 'AAPL', 'NVDA'])]

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/news', {
        params: { tickers: allTickers.join(',') }
      })
      setNews(data)
    } catch {
      setError('No se pudieron cargar las noticias.')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'todos' ? news : news.filter(n => n.ticker === filter)
  const filterTickers = ['todos', ...new Set(news.map(n => n.ticker))]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Noticias</h1>
          <p className="text-muted2 text-sm mt-0.5">Filtradas por tus activos y mercados</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-muted2 hover:text-buy transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros por ticker */}
      {!loading && news.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {filterTickers.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={clsx(
                'font-mono text-xs px-3 py-1.5 rounded-lg transition-all',
                filter === t
                  ? 'bg-buy/20 text-buy border border-buy/30'
                  : 'bg-s2 text-muted2 border border-border hover:text-txt'
              )}
            >
              {t === 'todos' ? 'Todos' : t}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-sell/10 border border-sell/20 rounded-xl px-5 py-4">
          <p className="font-mono text-sm text-sell">{error}</p>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 flex gap-4">
              <Skeleton className="w-20 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Noticias */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(item => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-4 flex gap-4 hover:border-border2 transition-colors group">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-20 h-16 object-cover rounded-lg shrink-0 bg-s2"
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-txt font-medium leading-snug group-hover:text-buy transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono text-[0.6rem] text-muted2 bg-s2 px-2 py-0.5 rounded">
                      {item.ticker}
                    </span>
                    <span className="font-mono text-[0.6rem] text-muted">{item.publisher}</span>
                    <span className="font-mono text-[0.6rem] text-muted">{timeAgo(item.time)}</span>
                  </div>
                </div>
                <ExternalLink size={13} className="text-muted shrink-0 mt-1 group-hover:text-buy transition-colors" strokeWidth={1.8} />
              </Card>
            </a>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-12 text-center">
          <Newspaper size={32} className="text-muted mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted2 text-sm">No se encontraron noticias.</p>
        </Card>
      )}
    </div>
  )
}
