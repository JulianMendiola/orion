# 🌌 ORION — Investment Intelligence Platform

**Plataforma de inteligencia de inversiones para el inversor argentino**: cartera consolidada, señales técnicas, chat con IA contextual, backtesting de estrategias y datos del mercado local (dólar MEP/blue/CCL, riesgo país, CEDEARs) — todo en tiempo real.

> Proyecto full-stack construido desde cero. Frontend React + backend Node/Express + PostgreSQL, con integración de IA (Anthropic Claude) y múltiples fuentes de datos financieros.

---

## ✨ ¿Qué hace?

- **📊 Dashboard consolidado** — valor de cartera, P&L realizado y no realizado, asignación de activos y brief diario generado con IA.
- **🇦🇷 Panel Argentina** — dólar oficial, blue, MEP, CCL y cripto en vivo, brecha cambiaria y riesgo país. Pestaña de CEDEARs con precio en pesos (BYMA) y subyacente en USD.
- **🤖 Orion Chat** — asistente IA (Claude) que conoce *tu* cartera real y los datos del mercado argentino al momento de responder. No es un chat genérico: responde sobre tus posiciones, tu P&L y el contexto macro local.
- **⚡ Señales técnicas** — motor propio de análisis: RSI, SMA 20/50/200, momentum, volatilidad y risk/reward, con niveles de convicción (ALTA/MEDIA/BAJA) y radar de oportunidades sobre un universo de 40+ tickers.
- **🧪 Backtesting** — 4 estrategias (RSI+SMA, Bollinger, ROC+Volumen, Momentum breakout) con métricas profesionales: Sharpe, Sortino, profit factor, max drawdown, win rate y curva de equity vs buy & hold. Incluye *macro guard*: salida automática si el SPY cae más de 7.8% en el día.
- **🔔 Alertas** — manuales (precio, % diario, RSI) y *smart alerts* detectadas automáticamente: sobreventa, dips de calidad, recuperaciones, cercanía a mínimos de 52 semanas.
- **📰 Noticias** — agregador de Yahoo Finance + medios económicos argentinos (Ámbito, iProfesional, Infobae, Perfil) vía RSS.
- **🌎 Mercados globales** — acciones, ETFs, cripto (CoinGecko), forex y bonos.

## 🧠 ¿Qué lo hace diferente?

1. **Foco en Argentina**: la mayoría de las apps de portfolio ignoran el mercado local. Orion integra MEP, CCL, brecha, riesgo país y CEDEARs como ciudadanos de primera clase.
2. **IA con contexto real**: el chat no responde genérico — recibe tu cartera y los datos macro del momento en cada conversación (con prompt caching para optimizar costos).
3. **Motor de análisis propio**: los indicadores técnicos y el backtesting están implementados desde cero en el backend, no son una API de terceros.
4. **Resiliencia**: caché en memoria por capa de datos, fallback a último dato conocido ante fallas de proveedores, rate limiting y degradación elegante (la app funciona sin DB y sin API key de IA, con menos features).

## 🛠 Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · Vite · Tailwind CSS · Zustand · React Router · Recharts |
| Backend | Node.js · Express (ES modules) |
| Base de datos | PostgreSQL (Supabase) — JWT + bcrypt para auth |
| IA | Anthropic API (Claude) con prompt caching |
| Datos de mercado | Yahoo Finance · CoinGecko · dolarapi.com · ArgentinaDatos |
| Deploy | Vercel (frontend) · Railway (backend) |

## 🏗 Arquitectura

```
orion/
├── frontend/          # SPA React (Vite)
│   ├── src/pages/     # Dashboard, Cartera, Mercados, Señales, Chat, Backtest, Alertas, Noticias
│   ├── src/store/     # Zustand: portfolio, market, alerts, auth (persistencia local)
│   └── src/services/  # Capa de API (axios)
└── backend/           # API REST Express
    └── src/routes/    # market, signals, chat, portfolio, news, auth
```

- El **portfolio se deriva de transacciones** (BUY/SELL/DEPOSIT/WITHDRAWAL), no de posiciones estáticas — P&L realizado y no realizado calculados al vuelo.
- **Sync a la nube opcional**: las carteras viven en localStorage y se sincronizan a PostgreSQL al iniciar sesión.
- Los indicadores técnicos se calculan server-side sobre velas diarias de Yahoo Finance.

## 🚀 Correrlo local

```bash
# 1. Instalar dependencias
npm run install:all

# 2. Configurar backend/.env
#    DATABASE_URL=postgresql://...   (opcional — sin DB corre en modo demo)
#    ANTHROPIC_API_KEY=sk-ant-...    (opcional — necesario para el chat IA)

# 3. Levantar todo (backend :4000 + frontend :5173)
npm run dev
```

## ⚠️ Disclaimer

Orion es una herramienta informativa y educativa. No constituye asesoramiento financiero ni recomendación de inversión.
