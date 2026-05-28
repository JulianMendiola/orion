import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' })

const COLORS = ['#4f8cff', '#00e5a0', '#c084fc', '#f97316', '#facc15', '#f43f5e', '#38bdf8', '#a3e635']

// ── Derivar posiciones de transacciones ──────────────────
export function derivePositions(portfolio) {
  if (!portfolio?.transactions) return []
  const map = {}
  let colorIdx = 0

  for (const t of [...portfolio.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (t.type !== 'BUY' && t.type !== 'SELL') continue
    if (!map[t.ticker]) {
      map[t.ticker] = {
        ticker: t.ticker, shares: 0, totalCost: 0,
        firstDate: t.date, colorIdx: colorIdx++,
      }
    }
    const pos = map[t.ticker]
    if (t.type === 'BUY') {
      pos.shares    += t.shares
      pos.totalCost += t.shares * t.price
    } else {
      const avgCost  = pos.totalCost / pos.shares
      pos.shares    -= t.shares
      pos.totalCost -= avgCost * t.shares
    }
  }

  return Object.values(map)
    .filter(p => p.shares > 0.0001)
    .map(p => ({
      id:          p.ticker,
      ticker:      p.ticker,
      name:        p.ticker,
      type:        'stock',
      shares:      parseFloat(p.shares.toFixed(6)),
      entryPrice:  parseFloat((p.totalCost / p.shares).toFixed(4)),
      entryDate:   p.firstDate,
      sector:      '',
      color:       COLORS[p.colorIdx % COLORS.length],
      targetPrice: portfolio.targetPrices?.[p.ticker] ?? null,
    }))
}

// ── Portfolio por defecto ────────────────────────────────
const DEFAULT_PORTFOLIO = {
  id:           'default',
  name:         'Principal',
  cash:         0,
  targetPrices: { META: null, LLY: null },
  transactions: [
    { id: 'tx1', type: 'BUY', ticker: 'META', date: '2026-05-21', shares: 14.03, price: 627.00, notes: '' },
    { id: 'tx2', type: 'BUY', ticker: 'LLY',  date: '2026-05-21', shares: 7.38,  price: 976.00, notes: '' },
  ],
}

function buildState(portfolios, activeId) {
  const active    = portfolios.find(p => p.id === activeId) ?? portfolios[0]
  const positions = derivePositions(active)
  const totalCapital = active?.transactions
    .filter(t => t.type === 'BUY')
    .reduce((s, t) => s + t.shares * t.price, 0) ?? 0
  return { portfolios, activePortfolioId: activeId, positions, totalCapital }
}

// ── Store ────────────────────────────────────────────────
export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      portfolios:        [DEFAULT_PORTFOLIO],
      activePortfolioId: 'default',
      positions:         derivePositions(DEFAULT_PORTFOLIO),
      totalCapital:      14.03 * 627 + 7.38 * 976,
      synced:            false,

      // ── Getters ──
      getActive: () => {
        const { portfolios, activePortfolioId } = get()
        return portfolios.find(p => p.id === activePortfolioId) ?? portfolios[0]
      },
      getPositions: (portfolioId) => {
        const { portfolios, activePortfolioId } = get()
        const p = portfolios.find(x => x.id === (portfolioId ?? activePortfolioId)) ?? portfolios[0]
        return derivePositions(p)
      },

      // ── Portfolio CRUD ──
      addPortfolio: (name) => set(s => {
        const id   = crypto.randomUUID()
        const next = [...s.portfolios, { id, name, cash: 0, targetPrices: {}, transactions: [] }]
        return buildState(next, id)
      }),

      renamePortfolio: (id, name) => set(s => {
        const next = s.portfolios.map(p => p.id === id ? { ...p, name } : p)
        return buildState(next, s.activePortfolioId)
      }),

      deletePortfolio: (id) => set(s => {
        if (s.portfolios.length <= 1) return s  // keep at least one
        const next   = s.portfolios.filter(p => p.id !== id)
        const active = s.activePortfolioId === id ? next[0].id : s.activePortfolioId
        return buildState(next, active)
      }),

      setActive: (id) => set(s => buildState(s.portfolios, id)),

      // ── Transactions ──
      addTransaction: (tx) => set(s => {
        const id  = s.activePortfolioId
        const next = s.portfolios.map(p =>
          p.id === id
            ? { ...p, transactions: [...p.transactions, { ...tx, id: crypto.randomUUID() }] }
            : p
        )
        return buildState(next, id)
      }),

      removeTransaction: (txId) => set(s => {
        const id  = s.activePortfolioId
        const next = s.portfolios.map(p =>
          p.id === id
            ? { ...p, transactions: p.transactions.filter(t => t.id !== txId) }
            : p
        )
        return buildState(next, id)
      }),

      // ── Cash ──
      addCash: (amount, date = new Date().toISOString().slice(0, 10), notes = '') => set(s => {
        const id   = s.activePortfolioId
        const tx   = { id: crypto.randomUUID(), type: 'DEPOSIT', date, amount, notes }
        const next = s.portfolios.map(p =>
          p.id === id ? { ...p, cash: p.cash + amount, transactions: [...p.transactions, tx] } : p
        )
        return buildState(next, id)
      }),

      withdrawCash: (amount) => set(s => {
        const id   = s.activePortfolioId
        const tx   = { id: crypto.randomUUID(), type: 'WITHDRAWAL', date: new Date().toISOString().slice(0, 10), amount }
        const next = s.portfolios.map(p =>
          p.id === id ? { ...p, cash: Math.max(0, p.cash - amount), transactions: [...p.transactions, tx] } : p
        )
        return buildState(next, id)
      }),

      // ── Price targets ──
      setTargetPrice: (ticker, price) => set(s => {
        const id  = s.activePortfolioId
        const next = s.portfolios.map(p =>
          p.id === id
            ? { ...p, targetPrices: { ...p.targetPrices, [ticker]: price } }
            : p
        )
        return buildState(next, id)
      }),

      // ── Portfolio metrics ──
      calcPortfolioValue: (quotes) => {
        const { positions, getActive } = get()
        const portfolio = getActive()
        const posValue  = positions.reduce((acc, pos) => {
          const q = quotes[pos.ticker]
          return acc + pos.shares * (q?.price ?? pos.entryPrice)
        }, 0)
        return posValue + (portfolio?.cash ?? 0)
      },

      calcTotalPnl: (quotes) => {
        const { positions } = get()
        return positions.reduce((acc, pos) => {
          const q = quotes[pos.ticker]
          if (!q) return acc
          return acc + (q.price - pos.entryPrice) * pos.shares
        }, 0)
      },

      // P&L realizado de operaciones SELL ya cerradas
      calcRealizedPnl: () => {
        const portfolio = get().getActive()
        if (!portfolio?.transactions) return 0
        const map = {}  // ticker → { shares, totalCost }
        let realized = 0
        for (const t of [...portfolio.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
          if (t.type === 'BUY') {
            if (!map[t.ticker]) map[t.ticker] = { shares: 0, totalCost: 0 }
            map[t.ticker].shares    += t.shares
            map[t.ticker].totalCost += t.shares * t.price
          } else if (t.type === 'SELL' && map[t.ticker]?.shares > 0) {
            const avgCost = map[t.ticker].totalCost / map[t.ticker].shares
            realized += (t.price - avgCost) * t.shares
            map[t.ticker].shares    -= t.shares
            map[t.ticker].totalCost -= avgCost * t.shares
          }
        }
        return realized
      },

      getPosition: (ticker) => get().positions.find(p => p.ticker === ticker),

      // ── Cloud sync ──
      syncFromCloud: async (token) => {
        if (!token) return
        try {
          const { data } = await api.get('/portfolio', {
            headers: { Authorization: `Bearer ${token}` },
          })
          // data is the portfolios array stored as JSONB
          if (data && Array.isArray(data) && data.length > 0) {
            const activeId = data[0].id
            set({ ...buildState(data, activeId), synced: true })
          }
        } catch { /* offline or first login */ }
      },

      saveToCloud: async (token) => {
        if (!token) return
        try {
          const { portfolios } = get()
          await api.post('/portfolio', { portfolios }, {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ synced: true })
        } catch { /* offline */ }
      },

      // ── Legacy addPosition / removePosition (used by AddPositionModal compat) ──
      addPosition: (pos) => get().addTransaction({
        type: 'BUY', ticker: pos.ticker, date: pos.entryDate ?? new Date().toISOString().slice(0, 10),
        shares: pos.shares, price: pos.entryPrice, notes: '',
      }),

      removePosition: (idOrTicker) => set(s => {
        const id  = s.activePortfolioId
        // Remove all transactions for this ticker
        const next = s.portfolios.map(p =>
          p.id === id
            ? { ...p, transactions: p.transactions.filter(t => t.ticker !== idOrTicker && t.id !== idOrTicker) }
            : p
        )
        return buildState(next, id)
      }),
    }),
    { name: 'orion-portfolio-v3' }
  )
)
