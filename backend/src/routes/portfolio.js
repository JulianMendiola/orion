import { Router } from 'express'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const yf = axios.create({
  baseURL: 'https://query1.finance.yahoo.com',
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; orion-app/1.0)' },
  timeout: 10000,
})

async function fetchHistory(ticker, range = '2y') {
  const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(ticker)}`, {
    params: { interval: '1d', range },
  })
  const result     = data?.chart?.result?.[0]
  const timestamps = result?.timestamp ?? []
  const closes     = result?.indicators?.quote?.[0]?.close ?? []
  return timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter(d => d.close != null)
}

async function fetchCurrentPrice(ticker) {
  try {
    const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(ticker)}`, {
      params: { interval: '1d', range: '1d' },
    })
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch { return null }
}

function nearestPrice(history, targetDate) {
  // Find exact or nearest prior trading day
  const sorted = history.filter(h => h.date <= targetDate)
  return sorted.length ? sorted[sorted.length - 1].close : (history[0]?.close ?? null)
}

// POST /api/portfolio/benchmark
router.post('/benchmark', async (req, res, next) => {
  try {
    const { transactions = [] } = req.body
    const buys = transactions
      .filter(t => t.type === 'BUY')
      .sort((a, b) => a.date.localeCompare(b.date))

    if (!buys.length) return res.json({ summary: null, equity: [] })

    // Fetch SPY & QQQ full history in parallel
    const [spyHist, qqqHist] = await Promise.all([
      fetchHistory('SPY', '5y'),
      fetchHistory('QQQ', '5y'),
    ])

    // Build date-indexed maps
    const spyMap = Object.fromEntries(spyHist.map(h => [h.date, h.close]))
    const qqqMap = Object.fromEntries(qqqHist.map(h => [h.date, h.close]))

    // Build phantom portfolios (invest same $ on each buy date)
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

    // Current prices
    const today     = new Date().toISOString().slice(0, 10)
    const spyNow    = nearestPrice(spyHist, today) ?? spyHist.at(-1)?.close ?? 0
    const qqqNow    = nearestPrice(qqqHist, today) ?? qqqHist.at(-1)?.close ?? 0
    const spyFinal  = parseFloat((spyShares * spyNow).toFixed(2))
    const qqqFinal  = parseFloat((qqqShares * qqqNow).toFixed(2))

    // Current portfolio value from positions
    const tickers       = [...new Set(buys.map(b => b.ticker))]
    const priceResults  = await Promise.all(tickers.map(t => fetchCurrentPrice(t)))
    const priceMap      = Object.fromEntries(tickers.map((t, i) => [t, priceResults[i]]))

    // Derive current positions from all transactions
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

    // Add today to checkpoints
    checkpoints.push({
      date:      today,
      label:     'Hoy',
      invested:  parseFloat(totalInvested.toFixed(2)),
      portfolio: portfolioFinal,
      spy:       spyFinal,
      qqq:       qqqFinal,
    })

    // Fill portfolio line: at intermediate points show invested capital
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

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key || url.includes('xxxx')) return null
  return createClient(url, key)
}

// GET /api/portfolio?userId=uuid
router.get('/', async (req, res, next) => {
  try {
    const supabase = getSupabase()
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data.map(p => ({
      id:         p.id,
      ticker:     p.ticker,
      name:       p.name,
      type:       p.type,
      shares:     p.shares,
      entryPrice: p.entry_price,
      entryDate:  p.entry_date,
      sector:     p.sector,
      color:      p.color,
      notes:      p.notes,
    })))
  } catch (err) { next(err) }
})

// POST /api/portfolio — create or replace all positions
router.post('/', async (req, res, next) => {
  try {
    const supabase = getSupabase()
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

    const { userId, positions } = req.body
    if (!userId || !Array.isArray(positions)) return res.status(400).json({ error: 'userId and positions required' })

    // Delete existing, then insert fresh (simple full-sync approach)
    await supabase.from('positions').delete().eq('user_id', userId)

    if (positions.length > 0) {
      const rows = positions.map(p => ({
        id:          p.id,
        user_id:     userId,
        ticker:      p.ticker,
        name:        p.name,
        type:        p.type,
        shares:      p.shares,
        entry_price: p.entryPrice,
        entry_date:  p.entryDate,
        sector:      p.sector,
        color:       p.color,
        notes:       p.notes ?? null,
      }))
      const { error } = await supabase.from('positions').insert(rows)
      if (error) throw error
    }

    res.json({ ok: true })
  } catch (err) { next(err) }
})

// DELETE /api/portfolio/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const supabase = getSupabase()
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' })

    const { error } = await supabase.from('positions').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
