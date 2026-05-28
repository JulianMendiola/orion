# ORION — Guía para Claude Code

Este archivo le dice a Claude Code cómo trabajar en este proyecto.

## Contexto del proyecto
ORION es una app de inversiones completa para múltiples activos (acciones, bonos, cripto, ETFs, forex). Stack: React + Vite + Tailwind (frontend), Node + Express (backend), Supabase (DB/auth), Anthropic API (señales IA).

## Design system
- **Colores**: ver `frontend/tailwind.config.js` — fondo oscuro (#07080d), acento verde (#00e5a0), señales buy/sell/hold
- **Fuentes**: Syne (display), JetBrains Mono (datos/código), DM Sans (body)
- **Componentes base**: `frontend/src/components/ui/index.jsx` — Card, Button, SignalBadge, Skeleton, SectionLabel, StatCell

## Convenciones de código
- Componentes React: functional + hooks, archivos .jsx, nombres PascalCase
- Stores: Zustand en `src/store/`, un archivo por dominio
- Servicios: `src/services/`, clases o módulos con métodos async
- Sin TypeScript por ahora (migrar en v1.0)
- Tailwind para todo el styling — sin CSS modules ni styled-components

## Próximas tareas prioritarias (por orden)

### 1. Conectar datos reales en Topbar
- `frontend/src/store/marketStore.js` llama a `marketService.getIndices()`
- El backend `backend/src/routes/market.js` usa yahoo-finance2
- Inicializar el store en `App.jsx` con `useMarketStore.getState().refresh()`

### 2. Gráfico de precio histórico
- Crear `frontend/src/components/portfolio/PriceChart.jsx`
- Usar Recharts `<AreaChart>` con datos de `/api/market/history/:ticker`
- Agregar al detalle de posición o a un modal

### 3. Agregar posiciones (modal)
- Crear `frontend/src/components/portfolio/AddPositionModal.jsx`
- Form: ticker (con search autocompletar), nombre, tipo, acciones, precio entrada, fecha
- Conectar con `portfolioStore.addPosition()`

### 4. Auth real con Supabase
- Inicializar `useAuthStore().init()` en `App.jsx` useEffect
- Descomentar el guard en `ProtectedRoute`
- Crear trigger en Supabase para auto-crear `profiles` al registrarse

### 5. Persistencia cloud de cartera
- Implementar `backend/src/routes/portfolio.js` con Supabase client
- Sincronizar `portfolioStore` con la DB en login

### 6. Página de Noticias
- Integrar NewsAPI o RSS feeds de Yahoo Finance
- Filtrar por tickers de la cartera del usuario
- Componente `NewsCard` con título, fuente, resumen IA (1 línea)

### 7. Deploy
- Frontend: `vercel --prod` desde `/frontend`
- Backend: Railway o Render, variables de entorno en panel
- Dominio: configurar en Vercel

## Variables de entorno necesarias
Ver `backend/.env.example` y `frontend/.env.example`

## Comandos útiles
```bash
# Dev
cd frontend && npm run dev
cd backend  && npm run dev

# Build frontend
cd frontend && npm run build
```
