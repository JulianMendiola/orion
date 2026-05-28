import { create } from 'zustand'
import { marketService } from '@/services/marketService'
import { format } from 'date-fns'

export const useMarketStore = create((set, get) => ({
  indices:     null,
  quotes:      {},      // { 'META': { price, pct, volume, ... } }
  lastUpdated: null,
  refreshing:  false,
  error:       null,

  refresh: async () => {
    if (get().refreshing) return
    set({ refreshing: true, error: null })
    try {
      const [indices, quotes] = await Promise.all([
        marketService.getIndices(),
        marketService.getWatchlistQuotes(),
      ])
      set({
        indices,
        quotes,
        lastUpdated: format(new Date(), 'HH:mm:ss'),
        refreshing: false,
      })
    } catch (err) {
      set({ error: err.message, refreshing: false })
    }
  },

  getQuote: (ticker) => get().quotes[ticker] ?? null,
}))
