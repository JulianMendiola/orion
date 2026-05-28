import { Router } from 'express'
import axios from 'axios'

const router = Router()

const yf = axios.create({
  baseURL: 'https://query1.finance.yahoo.com',
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; orion-app/1.0)' },
  timeout: 8000,
})

const yf2 = axios.create({
  baseURL: 'https://query2.finance.yahoo.com',
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; orion-app/1.0)' },
  timeout: 8000,
})

// Fetch quote snapshot from Yahoo chart API (works without crumb)
async function fetchQuote(symbol) {
  const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
    params: { interval: '1d', range: '1d', includePrePost: false },
  })
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) throw new Error(`No data for ${symbol}`)
  // Chart API doesn't include changePercent — derive it from previousClose
  const prev = meta.chartPreviousClose
  const cur  = meta.regularMarketPrice
  meta.regularMarketChange        = prev ? (cur - prev) : 0
  meta.regularMarketChangePercent = prev ? ((cur - prev) / prev) * 100 : 0
  return meta
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
      sp500:  { price: sp500.regularMarketPrice?.toLocaleString('en-US'),  pct: sp500.regularMarketChangePercent },
      nasdaq: { price: nasdaq.regularMarketPrice?.toLocaleString('en-US'), pct: nasdaq.regularMarketChangePercent },
      btc:    { price: btc.regularMarketPrice?.toLocaleString('en-US'),    pct: btc.regularMarketChangePercent },
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
    results.forEach((meta, i) => {
      if (!meta) return
      out[tickers[i]] = {
        ticker:  tickers[i],
        price:   meta.regularMarketPrice,
        pct:     meta.regularMarketChangePercent,
        change:  meta.regularMarketChange,
        volume:  meta.regularMarketVolume,
        high:    meta.regularMarketDayHigh,
        low:     meta.regularMarketDayLow,
        mktCap:  meta.marketCap,
      }
    })
    res.json(out)
  } catch (err) { next(err) }
})

// GET /api/market/history/:ticker?range=3mo
router.get('/history/:ticker', async (req, res, next) => {
  try {
    const { ticker } = req.params
    const rangeMap = { '1mo': '1mo', '3mo': '3mo', '6mo': '6mo', '1y': '1y' }
    const range = rangeMap[req.query.range] ?? '3mo'

    const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(ticker)}`, {
      params: { interval: '1d', range },
    })

    const result     = data?.chart?.result?.[0]
    const timestamps = result?.timestamp ?? []
    const closes     = result?.indicators?.quote?.[0]?.close ?? []
    const volumes    = result?.indicators?.quote?.[0]?.volume ?? []

    const out = timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString(), close: closes[i], volume: volumes[i] }))
      .filter(d => d.close != null)

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
    results.forEach((meta, i) => {
      if (!meta) return
      out[pairs[i]] = {
        ticker: pairs[i],
        price:  meta.regularMarketPrice,
        pct:    meta.regularMarketChangePercent,
        change: meta.regularMarketChange,
      }
    })
    res.json(out)
  } catch (err) { next(err) }
})

// GET /api/market/search?q=apple
router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q ?? ''
    const { data } = await yf2.get('/v1/finance/search', {
      params: { q, quotesCount: 8, newsCount: 0 },
    })
    res.json(data?.quotes?.slice(0, 8) ?? [])
  } catch (err) { next(err) }
})

export default router
