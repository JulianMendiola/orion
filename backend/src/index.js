import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import marketRoutes    from './routes/market.js'
import signalRoutes    from './routes/signals.js'
import portfolioRoutes from './routes/portfolio.js'
import newsRoutes      from './routes/news.js'

const app  = express()
const PORT = process.env.PORT ?? 4000

// ── Middleware ──────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? '').split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
    if (/\.vercel\.app$/.test(origin)) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())
app.use(rateLimit({ windowMs: 60_000, max: 60, message: { error: 'Too many requests' } }))

// ── Routes ──────────────────────────────────────────────
app.use('/api/market',    marketRoutes)
app.use('/api/signals',   signalRoutes)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/news',      newsRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ── Error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message ?? 'Internal server error' })
})

app.listen(PORT, () => console.log(`🌌 Orion backend running on :${PORT}`))
