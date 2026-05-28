import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })

// Default watchlist — expandable by user
const DEFAULT_TICKERS = ['META', 'LLY', 'AAPL', 'NVDA', 'MSFT', 'AMZN', 'TSLA', 'BTC-USD', 'ETH-USD', 'SPY']

export const marketService = {
  // Get major index snapshots
  async getIndices() {
    try {
      const { data } = await api.get('/market/indices')
      return data
    } catch {
      // Fallback mock while backend isn't running
      return {
        sp500:  { price: '5,308', pct: 0.42 },
        nasdaq: { price: '18,742', pct: 0.61 },
        btc:    { price: '106,240', pct: -0.83 },
      }
    }
  },

  // Get quotes for watchlist
  async getWatchlistQuotes(tickers = DEFAULT_TICKERS) {
    try {
      const { data } = await api.get('/market/quotes', { params: { tickers: tickers.join(',') } })
      return data
    } catch {
      return {}
    }
  },

  // Get OHLCV history for a ticker
  async getHistory(ticker, range = '3mo') {
    const { data } = await api.get(`/market/history/${ticker}`, { params: { range } })
    return data
  },

  // Search tickers
  async search(query) {
    const { data } = await api.get('/market/search', { params: { q: query } })
    return data
  },

  // Crypto prices via CoinGecko
  async getCryptoPrices(ids = ['bitcoin', 'ethereum', 'solana']) {
    try {
      const { data } = await api.get('/market/crypto', { params: { ids: ids.join(',') } })
      return data
    } catch {
      return {}
    }
  },

  // Forex rates — pairs in Yahoo Finance format: 'EURUSD=X', 'GBPUSD=X', ...
  async getForex(pairs = ['EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDARS=X', 'USDBRL=X']) {
    try {
      const { data } = await api.get('/market/forex', { params: { pairs: pairs.join(',') } })
      return data
    } catch {
      return {}
    }
  },
}
