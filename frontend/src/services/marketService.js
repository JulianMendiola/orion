import axios from 'axios'

// Must match every other service — fallback to localhost with /api prefix
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' })

// Guard: return fallback if the response isn't the expected type
function guard(data, fallback) {
  if (data === null || data === undefined) return fallback
  // If the backend returned HTML (proxy misconfiguration), return fallback
  if (typeof data === 'string') return fallback
  return data
}

const DEFAULT_TICKERS = ['META', 'LLY', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'BTC-USD', 'ETH-USD', 'SPY']

export const marketService = {
  async getIndices() {
    try {
      const { data } = await api.get('/market/indices')
      return guard(data, { sp500: { price: '—', pct: 0 }, nasdaq: { price: '—', pct: 0 }, btc: { price: '—', pct: 0 } })
    } catch {
      return { sp500: { price: '—', pct: 0 }, nasdaq: { price: '—', pct: 0 }, btc: { price: '—', pct: 0 } }
    }
  },

  async getWatchlistQuotes(tickers = DEFAULT_TICKERS) {
    try {
      const { data } = await api.get('/market/quotes', { params: { tickers: tickers.join(',') } })
      return guard(data, {})
    } catch {
      return {}
    }
  },

  async getHistory(ticker, range = '3mo') {
    try {
      const { data } = await api.get(`/market/history/${ticker}`, { params: { range } })
      return Array.isArray(guard(data, [])) ? data : []
    } catch {
      return []
    }
  },

  async search(query) {
    try {
      const { data } = await api.get('/market/search', { params: { q: query } })
      return Array.isArray(guard(data, [])) ? data : []
    } catch {
      return []
    }
  },

  async getCryptoPrices(ids = ['bitcoin', 'ethereum', 'solana']) {
    try {
      const { data } = await api.get('/market/crypto', { params: { ids: ids.join(',') } })
      return guard(data, {})
    } catch {
      return {}
    }
  },

  async getCedears() {
    try {
      const { data } = await api.get('/market/cedears')
      return Array.isArray(guard(data, [])) ? data : []
    } catch {
      return []
    }
  },

  async getArgentina() {
    try {
      const { data } = await api.get('/market/argentina')
      return guard(data, null)
    } catch {
      return null
    }
  },

  async getForex(pairs = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDARS=X', 'USDBRL=X']) {
    try {
      const { data } = await api.get('/market/forex', { params: { pairs: pairs.join(',') } })
      return guard(data, {})
    } catch {
      return {}
    }
  },
}
