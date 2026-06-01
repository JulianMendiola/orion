import { Router } from 'express'
import yahooFinance from 'yahoo-finance2'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router  = Router()
const YF_OPTS = { validateResult: false }

function rangeToDate(range) {
  const days = { '1d': 2, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 732, '5y': 1827 }
  return new Date(Date.now() - (days[range] ?? 732) * 86400 * 1000)
}

async function fetchHistory(ticker, range = '2y') {
  const period1 = rangeToDate(range)
  const result  = await yahooFinance.chart(ticker, { period1, interval: '1d' }, YF_OPTS)
  return (result.quotes ?? [])
    .filter(q => q.close != null)
    .map(q => ({
      date:  q.date instanceof Date ? q.date.toISOString().slice(0, 10) : new Date(q.date).toISOString().slice(0, 10),
      close: q.close,
    }))
}

async function fetchCurrentPrice(ticker) {
  try {
    const q = await yahooFinance.quote(ticker, {}, YF_OPTS)
    return q?.regularMarketPrice ?? null
  } catch { return null }
}

function nearestPrice(hist, targetDate) {
  const sorted = hist.filter(h => h.date <= targetDate)
  return sorted.length ? sorted[sorted.length - 1].close : (hist[0]?.close ?? null)
}

// POST /api/portfolio/benchmark
router.post('/benchmark', async (req, res, next) => {
  try {
    const { transactions = [] } = req.body
    const buys = transactions
      .filter(t => t.type === 'BUY')
      .sort((a, b) => a.date.localeCompare(b.date))

    if (!buys.length) return res.json({ summary: null, equity: [] })

    const [spyHist, qqqHist] = await Promise.all([
      fetchHistory('SPY', '5y'),
      fetchHistory('QQQ', '5y'),
    ])

    const spyMap = Object.fromEntries(spyHist.map(h => [h.date, h.close]))
    const qqqMap = Object.fromEntries(qqqHist.map(h => [h.date, h.close]))

    let spyShares = 0, qqqShares = 0, totalInvested = 0
    const checkpoints = []

    for (const buy of buys) {
      const amount    = buy.shares * buy.price
      totalInvested  += amount
      const spyPrice  = nearestPrice(spyHist, buy.date)
      const qqqPrice  = nearestPrice(qqqHist, buy.date)
      if (spyPrice) spyShares += amount / spyPrice
      if (qqqPrice) qqqShares += amount / qqqPrice

      checkpoints.push({
        date:      buy.date,
        label:     `${buy.ticker} ×${buy.shares}`,
        invested:  parseFloat(totalInvested.toFixed(2)),
        spy:       parseFloat((spyShares * (spyMap[buy.date] ?? nearestPrice(spyHist, buy.date))).toFixed(2)),
        qqq:       parseFloat((qqqShares * (qqqMap[buy.date] ?? nearestPrice(qqqHist, buy.date))).toFixed(2)),
      })
    }

    const today    = new Date().toISOString().slice(0, 10)
    const spyNow   = nearestPrice(spyHist, today) ?? spyHist.at(-1)?.close ?? 0
    const qqqNow   = nearestPrice(qqqHist, today) ?? qqqHist.at(-1)?.close ?? 0
    const spyFinal = parseFloat((spyShares * spyNow).toFixed(2))
    const qqqFinal = parseFloat((qqqShares * qqqNow).toFixed(2))

    const tickers      = [...new Set(buys.map(b => b.ticker))]
    const priceResults = await Promise.all(tickers.map(t => fetchCurrentPrice(t)))
    const priceMap     = Object.fromEntries(tickers.map((t, i) => [t, priceResults[i]]))

    const posMap = {}
    for (const t of transactions) {
      if (t.type === 'BUY') {
        if (!posMap[t.ticker]) posMap[t.ticker] = 0
        posMap[t.ticker] += t.shares
      } else if (t.type === 'SELL') {
        if (!posMap[t.ticker]) posMap[t.ticker] = 0
        posMap[t.ticker] -= t.shares
      }
    }
    let portfolioFinal = 0
    for (const [ticker, shares] of Object.entries(posMap)) {
      if (shares > 0) portfolioFinal += shares * (priceMap[ticker] ?? 0)
    }
    portfolioFinal = parseFloat(portfolioFinal.toFixed(2))

    checkpoints.push({
      date:      today,
      label:     'Hoy',
      invested:  parseFloat(totalInvested.toFixed(2)),
      portfolio: portfolioFinal,
      spy:       spyFinal,
      qqq:       qqqFinal,
    })

    const equity = checkpoints.map((c, i) => ({
      ...c,
      portfolio: c.portfolio ?? (i === checkpoints.length - 1 ? portfolioFinal : c.invested),
    }))

    const pReturn = totalInvested > 0 ? ((portfolioFinal - totalInvested) / totalInvested * 100) : 0
    const sReturn = totalInvested > 0 ? ((spyFinal - totalInvested) / totalInvested * 100) : 0
    const qReturn = totalInvested > 0 ? ((qqqFinal - totalInvested) / totalInvested * 100) : 0

    res.json({
      summary: {
        totalInvested,
        portfolioValue:  portfolioFinal,
        spyValue:        spyFinal,
        qqqValue:        qqqFinal,
        portfolioReturn: parseFloat(pReturn.toFixed(2)),
        spyReturn:       parseFloat(sReturn.toFixed(2)),
        qqqReturn:       parseFloat(qReturn.toFixed(2)),
      },
      equity,
    })
  } catch (err) { next(err) }
})

// GET /api/portfolio — load user's portfolios (JSONB blob)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM portfolios WHERE user_id = $1',
      [req.user.userId]
    )
    if (!rows.length) return res.json(null)
    res.json(rows[0].data)
  } catch (err) { next(err) }
})

// POST /api/portfolio — save user's portfolios (JSONB blob)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { portfolios } = req.body
    if (!portfolios) return res.status(400).json({ error: 'portfolios required' })
    await pool.query(
      `INSERT INTO portfolios (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2::jsonb, updated_at = NOW()`,
      [req.user.userId, JSON.stringify(portfolios)]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
