import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000' })

export const signalsService = {
  async generateSignals(tickers, entryPrices = {}) {
    const { data } = await api.post('/signals/generate', { tickers, entryPrices })
    return data
  },

  async generateBrief(portfolioSummary) {
    const { data } = await api.post('/signals/brief', { portfolioSummary })
    return data
  },

  async getOpportunities(exclude = []) {
    const { data } = await api.post('/signals/opportunities', { exclude })
    return data
  },

  async backtest(ticker, range = '1y') {
    const { data } = await api.post('/signals/backtest', { ticker, range })
    return data
  },

  async quickTechnical(ticker) {
    const { data } = await api.get(`/signals/quick/${encodeURIComponent(ticker.toUpperCase())}`)
    return data
  },
}
