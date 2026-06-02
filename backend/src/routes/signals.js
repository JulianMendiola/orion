import { Router } from 'express'
import yahooFinance from 'yahoo-finance2'

const router = Router()
const YF_OPTS = { validateResult: false }

// ── Helpers de fecha ─────────────────────────────────────
function rangeToDate(range) {
  const days = { '1d': 2, '5d': 7, '1mo': 31, '3mo': 92, '6mo': 183, '1y': 366, '2y': 732, '5y': 1827 }
  return new Date(Date.now() - (days[range] ?? 366) * 86400 * 1000)
}

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
  const sl   = closes.slice(-period)
  const mean = sl.reduce((a, b) => a + b, 0) / period
  return (Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / period) / mean) * 100
}

function momentum(closes, period = 10) {
  if (closes.length < period + 1) return null
  const old = closes[closes.length - period - 1]
  const cur = closes[closes.length - 1]
  return ((cur - old) / old) * 100
}

// ── Fetch con yahoo-finance2 ─────────────────────────────

async function fetchMeta(ticker) {
  const q = await yahooFinance.quote(ticker, {}, YF_OPTS)
  if (!q?.regularMarketPrice) throw new Error(`Sin datos para ${ticker}`)
  const prev = q.regularMarketPreviousClose ?? q.regularMarketPrice
  return {
    regularMarketPrice:          q.regularMarketPrice,
    regularMarketChangePercent:  q.regularMarketChangePercent ?? ((q.regularMarketPrice - prev) / prev * 100),
    regularMarketChange:         q.regularMarketChange ?? 0,
    fiftyTwoWeekHigh:            q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow:             q.fiftyTwoWeekLow  ?? null,
    chartPreviousClose:          prev,
  }
}

async function fetchHistory(ticker, range = '1y') {
  try {
    const period1 = rangeToDate(range)
    const result  = await yahooFinance.chart(ticker, { period1, interval: '1d' }, YF_OPTS)
    return (result.quotes ?? [])
      .filter(q => q.close != null)
      .map(q => q.close)
  } catch { return [] }
}

async function fetchHistoryFull(ticker, range = '1y') {
  try {
    const period1 = rangeToDate(range)
    const result  = await yahooFinance.chart(ticker, { period1, interval: '1d' }, YF_OPTS)
    return (result.quotes ?? [])
      .filter(q => q.close != null)
      .map(q => ({
        date:  q.date instanceof Date ? q.date.toISOString().slice(0, 10) : new Date(q.date).toISOString().slice(0, 10),
        close: q.close,
      }))
  } catch { return [] }
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

  let signal = 'ESPERAR'
  let conviction = 'BAJA'

  if (rsiVal !== null) {
    if      (rsiVal < 28 && aboveSma50)              { signal = 'COMPRAR';    conviction = 'ALTA' }
    else if (rsiVal < 38 && aboveSma20)              { signal = 'COMPRAR';    conviction = 'MEDIA' }
    else if (rsiVal < 45 && aboveSma50 && mom10 > 0) { signal = 'COMPRAR';    conviction = 'MEDIA' }
    else if (rsiVal > 75 && !aboveSma200)            { signal = 'PRECAUCIÓN'; conviction = 'ALTA' }
    else if (rsiVal > 70 || pct < -4)                { signal = 'PRECAUCIÓN'; conviction = 'MEDIA' }
    else if (rsiVal >= 45 && rsiVal <= 65 && aboveSma20) { signal = 'MANTENER'; conviction = 'MEDIA' }
    else if (aboveSma50 && aboveSma200)              { signal = 'MANTENER';   conviction = 'BAJA' }
  }
  if (pct < -5) { signal = 'PRECAUCIÓN'; conviction = 'ALTA' }

  const target   = weekHigh && dist52wH
    ? dist52wH > 15 ? price * 1.12 : price * 1.06
    : price * 1.08
  const stopLoss = sma50 ? sma50 * 0.97 : price * 0.93

  const rsiDesc  = !rsiVal ? '' :
    rsiVal < 30 ? `RSI en ${rsiVal.toFixed(0)} — zona de sobreventa extrema.` :
    rsiVal < 45 ? `RSI en ${rsiVal.toFixed(0)} — sobreventa técnica, presión compradora latente.` :
    rsiVal < 55 ? `RSI en ${rsiVal.toFixed(0)} — momentum neutral.` :
    rsiVal < 65 ? `RSI en ${rsiVal.toFixed(0)} — momentum positivo sostenido.` :
    rsiVal < 75 ? `RSI en ${rsiVal.toFixed(0)} — acercándose a zona de sobrecompra.` :
    `RSI en ${rsiVal.toFixed(0)} — sobrecompra técnica, riesgo de corrección.`

  const trendDesc = aboveSma200 === null ? '' :
    (aboveSma20 && aboveSma50 && aboveSma200) ? ' Precio sobre SMA20, SMA50 y SMA200 — tendencia alcista estructural.' :
    (aboveSma50 && aboveSma200) ? ` Sobre SMA50 ($${sma50?.toFixed(0)}) y SMA200 — tendencia positiva de largo plazo.` :
    aboveSma20  ? ` Sobre SMA20 ($${sma20?.toFixed(0)}) pero debajo de medias mayores — recuperación incipiente.` :
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

  const catalyst =
    signal === 'COMPRAR'    && rsiVal < 35  ? `Sobreventa RSI ${rsiVal.toFixed(0)} — oportunidad de entrada` :
    signal === 'COMPRAR'    && aboveSma50   ? `Momentum positivo sobre SMA50 ($${sma50?.toFixed(0)})` :
    signal === 'PRECAUCIÓN' && rsiVal > 70  ? `Sobrecompra RSI ${rsiVal.toFixed(0)} — toma de ganancias sugerida` :
    signal === 'PRECAUCIÓN' && pct < -4     ? `Caída diaria ${pct.toFixed(1)}% — evaluar stop-loss` :
    signal === 'MANTENER'   && aboveSma200  ? `Tendencia alcista estructural intacta` :
    `Análisis técnico multi-timeframe`

  return {
    price, pct_change: pct, signal, conviction,
    analysis: `${rsiDesc}${trendDesc}${weekDesc}${pnlDesc}${actionDesc}`,
    catalyst,
    targets: { objetivo: parseFloat(target.toFixed(2)), stopLoss: parseFloat(stopLoss.toFixed(2)) },
    indicators: {
      rsi:        rsiVal  != null ? parseFloat(rsiVal.toFixed(1))  : null,
      sma20:      sma20   != null ? parseFloat(sma20.toFixed(2))   : null,
      sma50:      sma50   != null ? parseFloat(sma50.toFixed(2))   : null,
      sma200:     sma200  != null ? parseFloat(sma200.toFixed(2))  : null,
      volatility: volat   != null ? parseFloat(volat.toFixed(2))   : null,
      momentum10: mom10   != null ? parseFloat(mom10.toFixed(2))   : null,
      weekHigh, weekLow,
      riskReward: riskReward ? parseFloat(riskReward) : null,
    },
  }
}

// ── GET /api/signals/health ──────────────────────────────
router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

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
          catalyst: 'Error de datos', targets: {}, indicators: {},
        }]
      }
    }))
    res.json(Object.fromEntries(results))
  } catch (err) { next(err) }
})

// ── POST /api/signals/opportunities ─────────────────────

const RADAR_UNIVERSE = [
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','NFLX',
  'LLY','JNJ','UNH','PFE','ABBV','MRK',
  'JPM','GS','BAC','BRK-B','V','MA',
  'XOM','CVX','COP',
  'SPY','QQQ','GLD',
  'COIN','MSTR',
]

router.post('/opportunities', async (req, res, next) => {
  try {
    const { exclude = [] } = req.body
    const universe = RADAR_UNIVERSE.filter(t => !exclude.includes(t))

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
      if (i + 5 < universe.length) await new Promise(r => setTimeout(r, 300))
    }

    const opportunities = results
      .filter(r => r.signal === 'COMPRAR')
      .sort((a, b) => {
        const scoreA = (a.conviction === 'ALTA' ? 3 : a.conviction === 'MEDIA' ? 2 : 1) - (a.indicators.rsi ?? 50) / 100
        const scoreB = (b.conviction === 'ALTA' ? 3 : b.conviction === 'MEDIA' ? 2 : 1) - (b.indicators.rsi ?? 50) / 100
        return scoreB - scoreA
      })
      .slice(0, 5)

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
    const { positions = [] } = portfolioSummary
    const tickers = positions.map(p => p.ticker)

    let signalCounts = { COMPRAR: 0, MANTENER: 0, 'PRECAUCIÓN': 0, ESPERAR: 0 }
    let totalPnl = 0

    const signalResults = await Promise.all(tickers.map(async ticker => {
      try {
        const [meta, closes] = await Promise.all([fetchMeta(ticker), fetchHistory(ticker)])
        const price = meta.regularMarketPrice
        const pct   = meta.regularMarketChangePercent
        const result = analyzeAsset({ ticker, price, pct, closes, weekHigh: meta.fiftyTwoWeekHigh, weekLow: meta.fiftyTwoWeekLow })
        signalCounts[result.signal] = (signalCounts[result.signal] ?? 0) + 1
        const pos = positions.find(p => p.ticker === ticker)
        if (pos) totalPnl += (price - pos.entryPrice) * pos.shares
        return { ticker, signal: result.signal, pct }
      } catch { return { ticker, signal: 'ESPERAR', pct: 0 } }
    }))

    const riskLevel = signalCounts['PRECAUCIÓN'] >= 2 ? 'ALTO' : signalCounts['PRECAUCIÓN'] === 1 ? 'MEDIO' : signalCounts.COMPRAR >= 1 ? 'BAJO' : 'MEDIO'
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

// ── Estrategias de backtest ──────────────────────────────
// Devuelve 'BUY' | 'SELL' | null para cada barra
// closes: array de precios de cierre hasta i (inclusive)
// history[i]: { date, close, volume? }

function stratRsiSma(closes) {
  const rsiVal = rsi(closes)
  const sma20v = sma(closes, 20)
  const sma50v = sma(closes, 50)
  const price  = closes[closes.length - 1]
  if (rsiVal === null) return null
  if (rsiVal < 35 && sma50v && price > sma50v * 0.96)  return 'BUY'
  if (rsiVal > 70 || (rsiVal > 65 && sma20v && price < sma20v)) return 'SELL'
  return null
}

function stratRocVolume(closes, volumes) {
  if (closes.length < 6) return null
  const price   = closes[closes.length - 1]
  const prev3   = closes[closes.length - 4]
  const prev5   = closes[closes.length - 6]
  const roc3    = ((price - prev3) / prev3) * 100
  const roc5    = ((price - prev5) / prev5) * 100
  // Relative volume (vs 20-day avg)
  let relVol = null
  if (volumes && volumes.length >= 20) {
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    relVol = avgVol > 0 ? volumes[volumes.length - 1] / avgVol : null
  }
  const pricePrev = closes[closes.length - 2]
  const isGreen   = price > pricePrev
  if (roc3 > 10 || (relVol !== null && relVol > 2 && isGreen)) return 'SELL'  // tomar ganancias
  if (roc5 < -8 && (relVol === null || relVol < 1.5)) return 'BUY'            // comprar caída
  return null
}

function stratBollinger(closes) {
  if (closes.length < 22) return null
  const slice  = closes.slice(-20)
  const mean   = slice.reduce((a, b) => a + b, 0) / 20
  const stdDev = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20)
  const upper  = mean + 2.5 * stdDev
  const lower  = mean - 2.0 * stdDev
  const price  = closes[closes.length - 1]
  if (price < lower) return 'BUY'
  if (price > upper) return 'SELL'
  return null
}

function stratMomentumBreakout(closes) {
  if (closes.length < 52) return null
  const price   = closes[closes.length - 1]
  const high52  = Math.max(...closes.slice(-52))
  const sma20v  = sma(closes, 20)
  const sma50v  = sma(closes, 50)
  const mom10v  = momentum(closes, 10)
  // Breakout: nuevo máximo de 52 semanas con SMA alineadas
  if (price >= high52 * 0.99 && sma20v && sma50v && price > sma20v && price > sma50v && mom10v > 5) return 'BUY'
  // Salida: momentum se revierte
  if (mom10v !== null && mom10v < -5) return 'SELL'
  return null
}

// ── POST /api/signals/backtest ───────────────────────────

const STRATEGIES = {
  rsi_sma:    { label: 'RSI + SMA',           fn: (closes)          => stratRsiSma(closes) },
  roc_volume: { label: 'ROC + Volumen',        fn: (closes, volumes) => stratRocVolume(closes, volumes) },
  bollinger:  { label: 'Bandas de Bollinger',  fn: (closes)          => stratBollinger(closes) },
  momentum:   { label: 'Momentum Breakout',    fn: (closes)          => stratMomentumBreakout(closes) },
}

function calcSharpe(equityArr, capital) {
  if (equityArr.length < 2) return null
  const returns = []
  for (let i = 1; i < equityArr.length; i++) {
    returns.push((equityArr[i] - equityArr[i - 1]) / equityArr[i - 1])
  }
  const mean   = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length)
  if (stdDev === 0) return null
  return parseFloat((mean / stdDev * Math.sqrt(252)).toFixed(2))
}

function calcSortino(equityArr) {
  if (equityArr.length < 2) return null
  const returns = []
  for (let i = 1; i < equityArr.length; i++) {
    returns.push((equityArr[i] - equityArr[i - 1]) / equityArr[i - 1])
  }
  const mean        = returns.reduce((a, b) => a + b, 0) / returns.length
  const downsideRet = returns.filter(r => r < 0)
  if (!downsideRet.length) return null
  const downDev = Math.sqrt(downsideRet.reduce((a, b) => a + b ** 2, 0) / downsideRet.length)
  if (downDev === 0) return null
  return parseFloat((mean / downDev * Math.sqrt(252)).toFixed(2))
}

router.post('/backtest', async (req, res, next) => {
  try {
    const { ticker, range = '1y', capital = 10000, strategy = 'rsi_sma', commission = 0 } = req.body
    const strat = STRATEGIES[strategy] ?? STRATEGIES.rsi_sma

    // Fetch history — also grab volumes for roc_volume strategy
    const period1 = rangeToDate(range)
    let history = []
    try {
      const result = await yahooFinance.chart(ticker, { period1, interval: '1d' }, YF_OPTS)
      history = (result.quotes ?? [])
        .filter(q => q.close != null)
        .map(q => ({
          date:   q.date instanceof Date ? q.date.toISOString().slice(0, 10) : new Date(q.date).toISOString().slice(0, 10),
          close:  q.close,
          volume: q.volume ?? 0,
        }))
    } catch { /* returns [] */ }

    if (history.length < 55) {
      return res.json({ error: 'Datos insuficientes para backtesting. Probá un período más largo o un ticker diferente.' })
    }

    // Fetch SPY for Macro Guard (skip if ticker IS SPY)
    let spyHistory = []
    if (ticker.toUpperCase() !== 'SPY') {
      try {
        const spyResult = await yahooFinance.chart('SPY', { period1, interval: '1d' }, YF_OPTS)
        spyHistory = (spyResult.quotes ?? []).filter(q => q.close != null).map(q => ({
          date:  q.date instanceof Date ? q.date.toISOString().slice(0, 10) : new Date(q.date).toISOString().slice(0, 10),
          close: q.close,
        }))
      } catch { /* no macro guard */ }
    }
    const spyByDate = Object.fromEntries(spyHistory.map(h => [h.date, h.close]))

    const commRate = (commission ?? 0) / 100  // e.g. 0.4% → 0.004
    const startIdx = Math.min(55, history.length - 10)
    let cash = capital, shares = 0, costBasis = 0
    const equity = [], trades = []
    let macroBlockUntil = -1   // Macro Guard: bar index until which entries are blocked

    for (let i = startIdx; i < history.length; i++) {
      const { date, close: price, volume } = history[i]
      const closes  = history.slice(0, i + 1).map(h => h.close)
      const volumes = history.slice(0, i + 1).map(h => h.volume)

      // ── Macro Guard: si SPY cae >7.8% hoy, salir y bloquear 8 barras ──
      const spyPrev = i > 0 ? spyByDate[history[i - 1].date] : null
      const spyNow  = spyByDate[date]
      if (spyPrev && spyNow && ((spyNow - spyPrev) / spyPrev * 100) < -7.8) {
        if (shares > 0) {
          const saleValue = shares * price * (1 - commRate)
          trades.push({
            type: 'SELL', date, price: parseFloat(price.toFixed(2)),
            pnl:  parseFloat((saleValue - costBasis).toFixed(2)),
            pct:  parseFloat(((saleValue - costBasis) / costBasis * 100).toFixed(2)),
            exit: 'Macro Guard',
          })
          cash = saleValue; shares = 0
        }
        macroBlockUntil = i + 8
      }

      const signal = strat.fn(closes, volumes)
      const portfolioValue = cash + shares * price
      const buyHoldValue   = capital * (price / history[startIdx].close)

      equity.push({
        date,
        strat:   parseFloat(portfolioValue.toFixed(2)),
        buyHold: parseFloat(buyHoldValue.toFixed(2)),
        signal,
      })

      // ── Entry ──
      if (signal === 'BUY' && shares === 0 && cash > 0 && i > macroBlockUntil) {
        const cost  = cash * commRate
        shares      = (cash - cost) / price
        costBasis   = cash - cost
        cash        = 0
        trades.push({ type: 'BUY', date, price: parseFloat(price.toFixed(2)), commission: parseFloat(cost.toFixed(2)) })
      }
      // ── Exit ──
      else if (signal === 'SELL' && shares > 0) {
        const gross     = shares * price
        const cost      = gross * commRate
        const saleValue = gross - cost
        trades.push({
          type: 'SELL', date, price: parseFloat(price.toFixed(2)),
          pnl:  parseFloat((saleValue - costBasis).toFixed(2)),
          pct:  parseFloat(((saleValue - costBasis) / costBasis * 100).toFixed(2)),
          exit: 'Señal técnica',
          commission: parseFloat(cost.toFixed(2)),
        })
        cash = saleValue; shares = 0
      }
    }

    const lastPrice  = history[history.length - 1].close
    const finalValue = cash + shares * lastPrice

    // ── Métricas ──
    let peak = capital, maxDrawdown = 0
    equity.forEach(e => {
      if (e.strat > peak) peak = e.strat
      const dd = (peak - e.strat) / peak * 100
      if (dd > maxDrawdown) maxDrawdown = dd
    })

    const sellTrades  = trades.filter(t => t.type === 'SELL')
    const wins        = sellTrades.filter(t => t.pnl > 0)
    const losses      = sellTrades.filter(t => t.pnl <= 0)
    const winRate     = sellTrades.length ? (wins.length / sellTrades.length * 100) : null
    const grossProfit = wins.reduce((a, b) => a + b.pnl, 0)
    const grossLoss   = Math.abs(losses.reduce((a, b) => a + b.pnl, 0))
    const profitFactor = grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : null
    const avgWin       = wins.length   ? parseFloat((grossProfit / wins.length).toFixed(2))  : null
    const avgLoss      = losses.length ? parseFloat((grossLoss   / losses.length).toFixed(2)) : null

    // Trade duration (días entre BUY y SELL)
    let totalDays = 0, durationCount = 0
    for (let i = 0; i < trades.length - 1; i++) {
      if (trades[i].type === 'BUY' && trades[i + 1].type === 'SELL') {
        const days = Math.round((new Date(trades[i + 1].date) - new Date(trades[i].date)) / 86400000)
        totalDays += days; durationCount++
      }
    }
    const avgDuration = durationCount ? Math.round(totalDays / durationCount) : null

    const equityValues = equity.map(e => e.strat)
    const sharpe  = calcSharpe(equityValues, capital)
    const sortino = calcSortino(equityValues)

    // Downsample equity para el gráfico (~300 pts max)
    const step = Math.max(1, Math.floor(equity.length / 300))
    const equityChart = equity.filter((_, i) => i % step === 0 || i === equity.length - 1)

    res.json({
      ticker, range, strategy, strategyLabel: strat.label,
      commission,
      stratReturn:   parseFloat(((finalValue - capital) / capital * 100).toFixed(2)),
      buyHoldReturn: parseFloat(((lastPrice - history[startIdx].close) / history[startIdx].close * 100).toFixed(2)),
      finalValue:    parseFloat(finalValue.toFixed(2)),
      maxDrawdown:   parseFloat(maxDrawdown.toFixed(2)),
      tradesCount:   trades.length,
      winRate:       winRate  !== null ? parseFloat(winRate.toFixed(1)) : null,
      profitFactor,
      sharpe,
      sortino,
      avgWin, avgLoss,
      avgDuration,
      equity: equityChart,
      trades,
    })
  } catch (err) { next(err) }
})

// ── GET /api/signals/smart-alerts — escaneo con caché 5 min ──────────────────

const QUALITY_TICKERS = new Set([
  'AAPL','MSFT','NVDA','GOOGL','META','AMZN','TSLA','JPM','V','MA','UNH','LLY','ABBV','JNJ',
])

let _smartCache = null
let _smartCacheTs = 0

router.get('/smart-alerts', async (req, res, next) => {
  try {
    if (_smartCache && Date.now() - _smartCacheTs < 5 * 60 * 1000) {
      return res.json({ ..._smartCache, cached: true })
    }

    const results = []
    for (let i = 0; i < RADAR_UNIVERSE.length; i += 5) {
      const batch = RADAR_UNIVERSE.slice(i, i + 5)
      const batch_results = await Promise.all(batch.map(async ticker => {
        try {
          const [meta, closes] = await Promise.all([fetchMeta(ticker), fetchHistory(ticker)])
          const price    = meta.regularMarketPrice
          const pctChg   = meta.regularMarketChangePercent
          const rsiVal   = rsi(closes)
          const sma20v   = sma(closes, 20)
          const sma50v   = sma(closes, 50)
          const sma200v  = sma(closes, 200)
          const mom10v   = momentum(closes, 10)
          const weekHigh = meta.fiftyTwoWeekHigh
          const weekLow  = meta.fiftyTwoWeekLow
          const dist52wL = weekLow  ? (price - weekLow)  / weekLow  * 100 : null
          const dist52wH = weekHigh ? (weekHigh - price) / weekHigh * 100 : null
          const isQuality = QUALITY_TICKERS.has(ticker)
          const inds = {
            rsi:        rsiVal  != null ? parseFloat(rsiVal.toFixed(1))  : null,
            sma50:      sma50v  != null ? parseFloat(sma50v.toFixed(2))  : null,
            sma200:     sma200v != null ? parseFloat(sma200v.toFixed(2)) : null,
            momentum10: mom10v  != null ? parseFloat(mom10v.toFixed(2))  : null,
            weekHigh, weekLow,
          }

          if (rsiVal !== null && rsiVal < 32 && sma50v && price > sma50v * 0.97) {
            return { type: 'BUY_OVERSOLD', action: 'COMPRAR', severity: 'high', conviction: 'ALTA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} — sobreventa extrema`,
              description: `RSI ${rsiVal.toFixed(0)} en zona de rebote técnico con soporte SMA50 $${sma50v.toFixed(0)}. Presión compradora latente.`,
              indicators: inds }
          }
          if (pctChg < -4 && isQuality && sma200v && price > sma200v * 0.92) {
            return { type: 'BUY_DIP', action: 'COMPRAR', severity: 'high', conviction: 'MEDIA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} cae ${pctChg.toFixed(1)}% — comprar la caída`,
              description: `Corrección intradía en activo blue-chip con tendencia alcista estructural (sobre SMA200 $${sma200v.toFixed(0)}).`,
              indicators: inds }
          }
          if (rsiVal !== null && rsiVal >= 30 && rsiVal <= 42 && sma50v && price > sma50v && mom10v !== null && mom10v > -4) {
            return { type: 'RECOVERY', action: 'COMPRAR', severity: 'medium', conviction: 'MEDIA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} — señal de recuperación`,
              description: `RSI ${rsiVal.toFixed(0)} saliendo de sobreventa sobre SMA50. Momentum ${mom10v >= 0 ? '+' : ''}${mom10v.toFixed(1)}%.`,
              indicators: inds }
          }
          if (dist52wL !== null && dist52wL < 7 && rsiVal !== null && rsiVal < 45) {
            return { type: 'NEAR_52LOW', action: 'COMPRAR', severity: 'medium', conviction: 'BAJA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} — zona de acumulación histórica`,
              description: `A ${dist52wL.toFixed(1)}% del mínimo de 52 semanas ($${weekLow?.toFixed(0)}) con RSI ${rsiVal.toFixed(0)}. Soporte técnico relevante.`,
              indicators: inds }
          }
          if (rsiVal !== null && rsiVal > 75 && dist52wH !== null && dist52wH < 3) {
            return { type: 'TAKE_PROFIT', action: 'PRECAUCIÓN', severity: 'warning', conviction: 'MEDIA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} — sobrecompra en máximos anuales`,
              description: `RSI ${rsiVal.toFixed(0)} a ${dist52wH.toFixed(1)}% del máximo de 52 semanas ($${weekHigh?.toFixed(0)}). Evaluar toma de ganancias.`,
              indicators: inds }
          }
          if (mom10v !== null && mom10v > 10 && sma20v && sma50v && price > sma20v && price > sma50v && rsiVal !== null && rsiVal > 45 && rsiVal < 72) {
            return { type: 'MOMENTUM', action: 'MANTENER', severity: 'info', conviction: 'MEDIA',
              ticker, price: parseFloat(price.toFixed(2)), pct_change: parseFloat(pctChg.toFixed(2)),
              title: `${ticker} — breakout de momentum`,
              description: `+${mom10v.toFixed(1)}% en 10d sobre SMA20 y SMA50 con RSI ${rsiVal.toFixed(0)}. Tendencia en aceleración.`,
              indicators: inds }
          }
          return null
        } catch { return null }
      }))
      results.push(...batch_results.filter(Boolean))
      if (i + 5 < RADAR_UNIVERSE.length) await new Promise(r => setTimeout(r, 200))
    }

    const SEV_ORDER = { high: 0, warning: 1, medium: 2, info: 3 }
    results.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])

    const payload = { alerts: results.slice(0, 12), scanned: RADAR_UNIVERSE.length, ts: new Date().toISOString() }
    _smartCache   = payload
    _smartCacheTs = Date.now()
    res.json(payload)
  } catch (err) { next(err) }
})

// ── GET /api/signals/quick/:ticker ───────────────────────

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
    res.json({
      ticker,
      price:      parseFloat(meta.regularMarketPrice.toFixed(2)),
      pct_change: parseFloat(meta.regularMarketChangePercent.toFixed(2)),
      rsi:        rsiVal != null ? parseFloat(rsiVal.toFixed(1)) : null,
      sma20:      sma20v != null ? parseFloat(sma20v.toFixed(2)) : null,
      sma50:      sma50v != null ? parseFloat(sma50v.toFixed(2)) : null,
      momentum10: mom10v != null ? parseFloat(mom10v.toFixed(2)) : null,
    })
  } catch (err) { next(err) }
})

export default router
