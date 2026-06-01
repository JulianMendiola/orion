import { Router } from 'express'
import axios from 'axios'
import yahooFinance from 'yahoo-finance2'

const router = Router()

// Suppress yahoo-finance2 validation noise
const YF_OPTS = { validateResult: false }

function rangeToDate(range) {
  const days = { '1d': 2, '5d': 7, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 732, '5y': 1827 }
  const d = days[range] ?? 366
  return new Date(Date.now() - d * 86400 * 1000)
}

async function fetchQuote(symbol) {
  const q = await yahooFinance.quote(symbol, {}, YF_OPTS)
  return q
}

// GET /api/market/indices
router.get('/indices', async (_req, res, next) => {
  try {
    const [sp500, nasdaq, btc] = await Promise.all([
      fetchQuote('^GSPC'),
      fetchQuote('^IXIC'),
      fetchQuote('BTC-USD'),
    ])
    res.json({
      sp500:  { price: sp500.regularMarketPrice?.toLocaleString('en-US'),  pct: sp500.regularMarketChangePercent  ?? 0 },
      nasdaq: { price: nasdaq.regularMarketPrice?.toLocaleString('en-US'), pct: nasdaq.regularMarketChangePercent ?? 0 },
      btc:    { price: btc.regularMarketPrice?.toLocaleString('en-US'),    pct: btc.regularMarketChangePercent    ?? 0 },
    })
  } catch (err) { next(err) }
})

// GET /api/market/quotes?tickers=META,LLY,AAPL
router.get('/quotes', async (req, res, next) => {
  try {
    const tickers = (req.query.tickers ?? '').split(',').filter(Boolean)
    if (!tickers.length) return res.json({})

    const results = await Promise.all(tickers.map(t => fetchQuote(t).catch(() => null)))
    const out = {}
    results.forEach((q, i) => {
      if (!q) return
      out[tickers[i]] = {
        ticker: tickers[i],
        price:  q.regularMarketPrice,
        pct:    q.regularMarketChangePercent ?? 0,
        change: q.regularMarketChange ?? 0,
        volume: q.regularMarketVolume,
        high:   q.regularMarketDayHigh,
        low:    q.regularMarketDayLow,
        mktCap: q.marketCap,
      }
    })
    res.json(out)
  } catch (err) { next(err) }
})

// GET /api/market/history/:ticker?range=3mo
router.get('/history/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params
    const range  = req.query.range ?? '3mo'
    const period1 = rangeToDate(range)

    const result = await yahooFinance.chart(ticker, { period1, interval: '1d' }, YF_OPTS)
    const quotes = result.quotes ?? []
    const out = quotes
      .filter(q => q.close != null)
      .map(q => ({
        date:   q.date instanceof Date ? q.date.toISOString() : new Date(q.date).toISOString(),
        close:  q.close,
        volume: q.volume,
      }))

    res.json(out)
  } catch (err) { next(err) }
})

// GET /api/market/crypto?ids=bitcoin,ethereum
router.get('/crypto', async (req, res, next) => {
  try {
    const ids = req.query.ids ?? 'bitcoin,ethereum,solana,binancecoin,ripple,cardano,avalanche-2'
    const { data } = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { timeout: 8000 }
    )
    res.json(data)
  } catch (err) { next(err) }
})

// GET /api/market/forex?pairs=EURUSD=X,GBPUSD=X
router.get('/forex', async (req, res, next) => {
  try {
    const pairs = (req.query.pairs ?? 'EURUSD=X,GBPUSD=X,USDJPY=X,USDARS=X,USDBRL=X,USDCAD=X').split(',').filter(Boolean)
    const results = await Promise.all(pairs.map(p => fetchQuote(p).catch(() => null)))
    const out = {}
    results.forEach((q, i) => {
      if (!q) return
      out[pairs[i]] = {
        ticker: pairs[i],
        price:  q.regularMarketPrice,
        pct:    q.regularMarketChangePercent ?? 0,
        change: q.regularMarketChange ?? 0,
      }
    })
    res.json(out)
  } catch (err) { next(err) }
})

// GET /api/market/search?q=apple
router.get('/search', async (req, res, next) => {
  try {
    const q      = req.query.q ?? ''
    const result = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 }, YF_OPTS)
    res.json(result.quotes?.slice(0, 8) ?? [])
  } catch (err) { next(err) }
})

export default router
