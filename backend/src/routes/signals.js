import { Router } from 'express'
import axios from 'axios'

const router = Router()

const yf = axios.create({
  baseURL: 'https://query1.finance.yahoo.com',
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; orion-app/1.0)' },
  timeout: 8000,
})

// ── Indicadores ──────────────────────────────────────────

function sma(closes, period) {
  if (closes.length < period) return null
  return closes.slice(-period).reduce((a, b) => a + b, 0) / period
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null
  const changes = closes.slice(-period - 1).map((c, i, a) => i === 0 ? 0 : c - a[i - 1]).slice(1)
  const avgGain = changes.map(c => c > 0 ? c : 0).reduce((a, b) => a + b, 0) / period
  const avgLoss = changes.map(c => c < 0 ? Math.abs(c) : 0).reduce((a, b) => a + b, 0) / period
  if (avgLoss === 0) return 100
  return 100 - (100 / (1 + avgGain / avgLoss))
}

function volatility(closes, period = 20) {
  if (closes.length < period) return null
  const sl = closes.slice(-period)
  const mean = sl.reduce((a, b) => a + b, 0) / period
  return (Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / period) / mean) * 100
}

function momentum(closes, period = 10) {
  if (closes.length < period + 1) return null
  const old = closes[closes.length - period - 1]
  const cur = closes[closes.length - 1]
  return ((cur - old) / old) * 100
}

// ── Lógica de señal ──────────────────────────────────────

function analyzeAsset({ ticker, price, pct, closes, entryPrice, weekHigh, weekLow }) {
  const rsiVal  = rsi(closes)
  const sma20   = sma(closes, 20)
  const sma50   = sma(closes, 50)
  const sma200  = sma(closes, 200)
  const volat   = volatility(closes)
  const mom10   = momentum(closes, 10)
  const aboveSma20  = sma20  ? price > sma20  : null
  const aboveSma50  = sma50  ? price > sma50  : null
  const aboveSma200 = sma200 ? price > sma200 : null
  const dist52wH = weekHigh ? ((weekHigh - price) / weekHigh) * 100 : null
  const dist52wL = weekLow  ? ((price - weekLow) / weekLow) * 100 : null
  const pnlPct   = entryPrice ? ((price - entryPrice) / entryPrice) * 100 : null
  const riskReward = (sma20 && weekHigh && weekLow)
    ? Math.abs((weekHigh * 0.95 - price) / (price - weekLow * 1.05)).toFixed(1)
    : null

  // ── Señal ──
  let signal = 'ESPERAR'
  let conviction = 'BAJA'

  if (rsiVal !== null) {
    if (rsiVal < 28 && aboveSma50) {
      signal = 'COMPRAR'; conviction = 'ALTA'
    } else if (rsiVal < 38 && aboveSma20) {
      signal = 'COMPRAR'; conviction = 'MEDIA'
    } else if (rsiVal < 45 && aboveSma50 && mom10 > 0) {
      signal = 'COMPRAR'; conviction = 'MEDIA'
    } else if (rsiVal > 75 && !aboveSma200) {
      signal = 'PRECAUCIÓN'; conviction = 'ALTA'
    } else if (rsiVal > 70 || pct < -4) {
      signal = 'PRECAUCIÓN'; conviction = 'MEDIA'
    } else if (rsiVal >= 45 && rsiVal <= 65 && aboveSma20) {
      signal = 'MANTENER'; conviction = 'MEDIA'
    } else if (aboveSma50 && aboveSma200) {
      signal = 'MANTENER'; conviction = 'BAJA'
    }
  }
  if (pct < -5) { signal = 'PRECAUCIÓN'; conviction = 'ALTA' }

  // ── Precio objetivo (resistencia técnica) ──
  const target = weekHigh && dist52wH
    ? dist52wH > 15 ? price * 1.12 : price * 1.06
    : price * 1.08
  const stopLoss = sma50 ? sma50 * 0.97 : price * 0.93

  // ── Texto análisis ──
  const rsiDesc = !rsiVal ? '' :
    rsiVal < 30 ? `RSI en ${rsiVal.toFixed(0)} — zona de sobreventa extrema.` :
    rsiVal < 45 ? `RSI en ${rsiVal.toFixed(0)} — sobreventa técnica, presión compradora latente.` :
    rsiVal < 55 ? `RSI en ${rsiVal.toFixed(0)} — momentum neutral.` :
    rsiVal < 65 ? `RSI en ${rsiVal.toFixed(0)} — momentum positivo sostenido.` :
    rsiVal < 75 ? `RSI en ${rsiVal.toFixed(0)} — acercándose a zona de sobrecompra.` :
    `RSI en ${rsiVal.toFixed(0)} — sobrecompra técnica, riesgo de corrección.`

  const trendDesc = aboveSma200 === null ? '' :
    (aboveSma20 && aboveSma50 && aboveSma200) ? ' Precio sobre SMA20, SMA50 y SMA200 — tendencia alcista estructural.' :
    (aboveSma50 && aboveSma200) ? ` Sobre SMA50 ($${sma50?.toFixed(0)}) y SMA200 — tendencia positiva de largo plazo.` :
    aboveSma20 ? ` Sobre SMA20 ($${sma20?.toFixed(0)}) pero debajo de medias mayores — recuperación incipiente.` :
    ` Debajo de SMA20 ($${sma20?.toFixed(0)}) — presión vendedora dominante.`

  const weekDesc = dist52wH !== null ?
    ` Se ubica ${dist52wH.toFixed(1)}% por debajo del máximo anual ($${weekHigh?.toFixed(0)}).` : ''

  const pnlDesc = pnlPct !== null ?
    ` Tu posición acumula un ${pnlPct >= 0 ? 'retorno' : 'pérdida'} de ${Math.abs(pnlPct).toFixed(2)}% desde entrada.` : ''

  const actionDesc = {
    COMPRAR:    ` Recomendamos acumular en esta zona con stop-loss en $${stopLoss?.toFixed(0)} y objetivo $${target?.toFixed(0)}.`,
    MANTENER:   ` Mantener posición con trailing stop en SMA50 ($${sma50?.toFixed(0) ?? '—'}).`,
    PRECAUCIÓN: ` Reducir exposición o cubrir posición. Evitar nuevas entradas por encima de este nivel.`,
    ESPERAR:    ` Aguardar señal técnica más clara antes de operar.`,
  }[signal]

  const analysis = `${rsiDesc}${trendDesc}${weekDesc}${pnlDesc}${actionDesc}`

  const catalyst =
    signal === 'COMPRAR'    && rsiVal < 35 ? `Sobreventa RSI ${rsiVal.toFixed(0)} — oportunidad de entrada` :
    signal === 'COMPRAR'    && aboveSma50  ? `Momentum positivo sobre SMA50 ($${sma50?.toFixed(0)})` :
    signal === 'PRECAUCIÓN' && rsiVal > 70 ? `Sobrecompra RSI ${rsiVal.toFixed(0)} — toma de ganancias sugerida` :
    signal === 'PRECAUCIÓN' && pct < -4    ? `Caída diaria ${pct.toFixed(1)}% — evaluar stop-loss` :
    signal === 'MANTENER'   && aboveSma200 ? `Tendencia alcista estructural intacta` :
    `Análisis técnico multi-timeframe`

  return {
    price, pct_change: pct, signal, conviction, analysis, catalyst,
    targets: { objetivo: parseFloat(target.toFixed(2)), stopLoss: parseFloat(stopLoss.toFixed(2)) },
    indicators: {
      rsi:   rsiVal  != null ? parseFloat(rsiVal.toFixed(1))  : null,
      sma20: sma20   != null ? parseFloat(sma20.toFixed(2))   : null,
      sma50: sma50   != null ? parseFloat(sma50.toFixed(2))   : null,
      sma200:sma200  != null ? parseFloat(sma200.toFixed(2))  : null,
      volatility: volat != null ? parseFloat(volat.toFixed(2)) : null,
      momentum10: mom10 != null ? parseFloat(mom10.toFixed(2)) : null,
      weekHigh, weekLow,
      riskReward: riskReward ? parseFloat(riskReward) : null,
    },
  }
}

// ── Fetch ────────────────────────────────────────────────

async function fetchMeta(ticker) {
  const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(ticker)}`, {
    params: { interval: '1d', range: '1d' },
  })
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) throw new Error(`Sin datos para ${ticker}`)
  const prev = meta.chartPreviousClose
  meta.regularMarketChangePercent = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0
  meta.regularMarketChange = prev ? meta.regularMarketPrice - prev : 0
  return meta
}

async function fetchHistory(ticker, range = '1y') {
  const { data } = await yf.get(`/v8/finance/chart/${encodeURIComponent(ticker)}`, {
    params: { interval: '1d', range },
  })
  const closes = (data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(c => c != null)
  return closes
}

// ── POST /api/signals/generate ───────────────────────────

router.post('/generate', async (req, res, next) => {
  try {
    const { tickers = [], entryPrices = {} } = req.body
    const results = await Promise.all(tickers.map(async ticker => {
      try {
        const [meta, closes] = await Promise.all([fetchMeta(ticker), fetchHistory(ticker)])
        const result = analyzeAsset({
          ticker,
          price:      meta.regularMarketPrice,
          pct:        meta.regularMarketChangePercent,
          closes,
          entryPrice: entryPrices[ticker],
          weekHigh:   meta.fiftyTwoWeekHigh,
          weekLow:    meta.fiftyTwoWeekLow,
        })
        return [ticker, result]
      } catch {
        return [ticker, {
          price: entryPrices[ticker] ?? 0, pct_change: 0,
          signal: 'ESPERAR', conviction: 'BAJA',
          analysis: 'No se pudieron obtener datos para este activo.',
          catalyst: 'Error de conexión', targets: {}, indicators: {},
        }]
      }
    }))
    res.json(Object.fromEntries(results))
  } catch (err) { next(err) }
})

// ── POST /api/signals/opportunities ─────────────────────
// Escanea el mercado y recomienda las mejores oportunidades

const RADAR_UNIVERSE = [
  // Mega cap tech
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','NFLX',
  // Salud / Pharma
  'LLY','JNJ','UNH','PFE','ABBV','MRK',
  // Finanzas
  'JPM','GS','BAC','BRK-B','V','MA',
  // Energía / Commodities
  'XOM','CVX','COP',
  // ETFs clave
  'SPY','QQQ','GLD',
  // Cripto proxies
  'COIN','MSTR',
]

router.post('/opportunities', async (req, res, next) => {
  try {
    const { exclude = [] } = req.body
    const universe = RADAR_UNIVERSE.filter(t => !exclude.includes(t))

    // Procesar en lotes de 5 para no saturar Yahoo Finance
    const results = []
    for (let i = 0; i < universe.length; i += 5) {
      const batch = universe.slice(i, i + 5)
      const batchResults = await Promise.all(batch.map(async ticker => {
        try {
          const [meta, closes] = await Promise.all([fetchMeta(ticker), fetchHistory(ticker)])
          const analysis = analyzeAsset({
            ticker,
            price:    meta.regularMarketPrice,
            pct:      meta.regularMarketChangePercent,
            closes,
            weekHigh: meta.fiftyTwoWeekHigh,
            weekLow:  meta.fiftyTwoWeekLow,
          })
          return { ticker, ...analysis }
        } catch { return null }
      }))
      results.push(...batchResults.filter(Boolean))
      // Pausa breve entre lotes
      if (i + 5 < universe.length) await new Promise(r => setTimeout(r, 300))
    }

    // Filtrar y rankear oportunidades
    const opportunities = results
      .filter(r => r.signal === 'COMPRAR')
      .sort((a, b) => {
        const scoreA = (a.conviction === 'ALTA' ? 3 : a.conviction === 'MEDIA' ? 2 : 1)
          - (a.indicators.rsi ?? 50) / 100
        const scoreB = (b.conviction === 'ALTA' ? 3 : b.conviction === 'MEDIA' ? 2 : 1)
          - (b.indicators.rsi ?? 50) / 100
        return scoreB - scoreA
      })
      .slice(0, 5)

    // Top activos a vigilar (MANTENER con buen momentum)
    const watchlist = results
      .filter(r => r.signal === 'MANTENER' && r.indicators.momentum10 > 3)
      .sort((a, b) => (b.indicators.momentum10 ?? 0) - (a.indicators.momentum10 ?? 0))
      .slice(0, 3)

    res.json({ opportunities, watchlist, scanned: results.length })
  } catch (err) { next(err) }
})

// ── POST /api/signals/brief ──────────────────────────────

router.post('/brief', async (req, res, next) => {
  try {
    const { portfolioSummary } = req.body
    const { positions = [], totalCapital = 0 } = portfolioSummary
    const tickers = positions.map(p => p.ticker)

    let signalCounts = { COMPRAR: 0, MANTENER: 0, PRECAUCIÓN: 0, ESPERAR: 0 }
    let totalPnl = 0

    const signalResults = await Promise.all(tickers.map(async ticker => {
      try {
        const [meta, closes] = await Promise.all([fetchMeta(ticker), fetchHistory(ticker)])
        const price = meta.regularMarketPrice
        const pct   = meta.regularMarketChangePercent
        const result = analyzeAsset({ ticker, price, pct, closes, weekHigh: meta.fiftyTwoWeekHigh, weekLow: meta.fiftyTwoWeekLow })
        signalCounts[result.signal]++
        const pos = positions.find(p => p.ticker === ticker)
        if (pos) totalPnl += (price - pos.entryPrice) * pos.shares
        return { ticker, signal: result.signal, pct }
      } catch { return { ticker, signal: 'ESPERAR', pct: 0 } }
    }))

    const riskLevel = signalCounts.PRECAUCIÓN >= 2 ? 'ALTO' : signalCounts.PRECAUCIÓN === 1 ? 'MEDIO' : signalCounts.COMPRAR >= 1 ? 'BAJO' : 'MEDIO'
    const avgPct    = signalResults.reduce((a, b) => a + (b.pct ?? 0), 0) / (signalResults.length || 1)
    const tone      = avgPct > 0.5 ? 'alcista' : avgPct < -0.5 ? 'bajista' : 'lateral'
    const pnlText   = totalPnl >= 0 ? `ganancia de $${totalPnl.toFixed(0)}` : `pérdida de $${Math.abs(totalPnl).toFixed(0)}`
    const warnList  = signalResults.filter(s => s.signal === 'PRECAUCIÓN').map(s => s.ticker)
    const buyList   = signalResults.filter(s => s.signal === 'COMPRAR').map(s => s.ticker)

    const action = warnList.length > 0
      ? `Recomendamos revisar exposición en ${warnList.join(', ')}.`
      : buyList.length > 0
        ? `${buyList.join(', ')} presenta oportunidad de acumulación táctica.`
        : 'Mantener posiciones actuales con disciplina de stop-loss.'

    res.json({
      brief: `El mercado opera en tono ${tone} con variación promedio de ${avgPct >= 0 ? '+' : ''}${avgPct.toFixed(2)}% en cartera. Tu portafolio registra una ${pnlText} respecto a precios de entrada. ${action}`,
      riskLevel,
    })
  } catch (err) { next(err) }
})

// ── POST /api/signals/backtest ───────────────────────────

async function fetchHistoryFull(ticker, range = '1y') {
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

router.post('/backtest', async (req, res, next) => {
  try {
    const { ticker, range = '1y', capital = 10000 } = req.body
    const history = await fetchHistoryFull(ticker, range)

    if (history.length < 55) {
      return res.json({ error: 'Datos insuficientes para backtesting' })
    }

    const startIdx = Math.min(50, history.length - 10)
    let cash = capital
    let shares = 0
    const equity  = []
    const trades  = []
    let costBasis = 0

    for (let i = startIdx; i < history.length; i++) {
      const { date, close: price } = history[i]
      const closes   = history.slice(0, i + 1).map(h => h.close)
      const wSlice   = closes.slice(-252)
      const weekHigh = Math.max(...wSlice)
      const weekLow  = Math.min(...wSlice)

      const result = analyzeAsset({ ticker, price, pct: 0, closes, weekHigh, weekLow })

      const portfolioValue = cash + shares * price
      const buyHoldValue   = capital * (price / history[startIdx].close)

      equity.push({
        date,
        strat:   parseFloat(portfolioValue.toFixed(2)),
        buyHold: parseFloat(buyHoldValue.toFixed(2)),
        signal:  result.signal,
      })

      if (result.signal === 'COMPRAR' && shares === 0 && cash > 0) {
        shares = cash / price
        costBasis = cash
        cash = 0
        trades.push({ type: 'BUY', date, price: parseFloat(price.toFixed(2)) })
      } else if (result.signal === 'PRECAUCIÓN' && shares > 0) {
        const saleValue = shares * price
        trades.push({
          type:  'SELL',
          date,
          price: parseFloat(price.toFixed(2)),
          pnl:   parseFloat((saleValue - costBasis).toFixed(2)),
          pct:   parseFloat(((saleValue - costBasis) / costBasis * 100).toFixed(2)),
        })
        cash   = saleValue
        shares = 0
      }
    }

    const lastPrice  = history[history.length - 1].close
    const finalValue = cash + shares * lastPrice

    // Max drawdown
    let peak = capital
    let maxDrawdown = 0
    equity.forEach(e => {
      if (e.strat > peak) peak = e.strat
      const dd = (peak - e.strat) / peak * 100
      if (dd > maxDrawdown) maxDrawdown = dd
    })

    // Win rate
    const sellTrades = trades.filter(t => t.type === 'SELL')
    const wins       = sellTrades.filter(t => t.pnl > 0).length
    const winRate    = sellTrades.length ? (wins / sellTrades.length * 100) : null

    res.json({
      ticker,
      range,
      stratReturn:   parseFloat(((finalValue - capital) / capital * 100).toFixed(2)),
      buyHoldReturn: parseFloat(((lastPrice - history[startIdx].close) / history[startIdx].close * 100).toFixed(2)),
      finalValue:    parseFloat(finalValue.toFixed(2)),
      maxDrawdown:   parseFloat(maxDrawdown.toFixed(2)),
      tradesCount:   trades.length,
      winRate:       winRate !== null ? parseFloat(winRate.toFixed(1)) : null,
      equity,
      trades,
    })
  } catch (err) { next(err) }
})

// ── GET /api/signals/quick/:ticker  — indicadores rápidos para alertas técnicas
router.get('/quick/:ticker', async (req, res, next) => {
  try {
    const ticker = req.params.ticker.toUpperCase()
    const [meta, closes] = await Promise.all([
      fetchMeta(ticker),
      fetchHistory(ticker, '3mo'),
    ])
    const rsiVal  = rsi(closes)
    const sma20v  = sma(closes, 20)
    const sma50v  = sma(closes, 50)
    const mom10v  = momentum(closes, 10)
    const price   = meta.regularMarketPrice
    const pct     = meta.regularMarketChangePercent
    res.json({
      ticker,
      price:      parseFloat(price.toFixed(2)),
      pct_change: parseFloat(pct.toFixed(2)),
      rsi:        rsiVal  != null ? parseFloat(rsiVal.toFixed(1))  : null,
      sma20:      sma20v  != null ? parseFloat(sma20v.toFixed(2))  : null,
      sma50:      sma50v  != null ? parseFloat(sma50v.toFixed(2))  : null,
      momentum10: mom10v  != null ? parseFloat(mom10v.toFixed(2))  : null,
    })
  } catch (err) { next(err) }
})

export default router
