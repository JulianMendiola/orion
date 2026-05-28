# 🌌 ORION — Investment Intelligence Platform

Una plataforma de inversiones completa: cartera personal, señales IA, mercados en tiempo real y análisis diario. Acciones, bonos, cripto, ETFs y Forex.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Estado global | Zustand |
| Routing | React Router v6 |
| Gráficos | Recharts |
| Backend | Node.js + Express |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime) |
| IA / Señales | Anthropic API (claude-sonnet-4) |
| Datos mercado | Yahoo Finance unofficial + CoinGecko + Alpha Vantage |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Estructura

```
orion/
├── frontend/          # React app
│   └── src/
│       ├── components/
│       │   ├── layout/       # Sidebar, Topbar, Layout
│       │   ├── dashboard/    # Widgets del dashboard
│       │   ├── markets/      # Tablas de mercado
│       │   ├── portfolio/    # Cartera y posiciones
│       │   ├── signals/      # Señales IA
│       │   ├── news/         # Feed de noticias
│       │   ├── auth/         # Login / Register
│       │   └── ui/           # Componentes base (Button, Card, Badge...)
│       ├── pages/            # Dashboard, Markets, Portfolio, Signals, News
│       ├── hooks/            # useMarketData, usePortfolio, useSignals...
│       ├── services/         # API calls al backend
│       ├── store/            # Zustand stores
│       └── utils/            # Formatters, helpers
├── backend/           # Express API
│   └── src/
│       ├── routes/           # /api/market, /api/portfolio, /api/signals...
│       ├── controllers/      # Lógica de cada ruta
│       ├── services/         # Yahoo Finance, CoinGecko, Anthropic, Supabase
│       ├── middleware/        # Auth, rate limiting, error handling
│       └── models/           # Schemas Supabase
└── docs/              # Guías de setup y deploy
```

---

## Inicio rápido

### 1. Clonar y configurar

```bash
git clone <repo>
cd orion

# Backend
cd backend
cp .env.example .env    # Completar variables
npm install
npm run dev             # Puerto 4000

# Frontend (nueva terminal)
cd frontend
cp .env.example .env    # Completar variables
npm install
npm run dev             # Puerto 5173
```

### 2. Variables de entorno necesarias

**Backend `.env`:**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
ALPHA_VANTAGE_KEY=
PORT=4000
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Roadmap

- [x] v0.1 — Estructura base + diseño sistema
- [ ] v0.2 — Dashboard + datos mercado real
- [ ] v0.3 — Portfolio tracker + P&L
- [ ] v0.4 — Señales IA por activo
- [ ] v0.5 — Auth + usuarios múltiples
- [ ] v0.6 — Noticias filtradas + alertas
- [ ] v1.0 — Deploy producción
