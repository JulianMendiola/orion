import { Router } from 'express'
import axios from 'axios'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

async function getContextoArgentina() {
  try {
    const { data } = await axios.get('http://localhost:' + (process.env.PORT ?? 4000) + '/api/market/argentina', { timeout: 5000 })
    return data
  } catch { return null }
}

function buildSystemPrompt(portfolio, argentina) {
  let ctx = `Sos Orion, un analista financiero argentino experto. Hablás en español rioplatense, claro y directo.
Conocés el mercado argentino (CEDEARs, MEP, CCL, blue, cepo, riesgo país, FCIs, ONs) y los mercados globales.
Respondé corto y concreto. Usá los datos reales que tenés abajo. Si no sabés algo, decilo.
IMPORTANTE: no sos asesor financiero registrado en CNV — tus respuestas son informativas, no recomendaciones de inversión. Mencionalo solo si te piden una recomendación directa de compra/venta.`

  if (argentina) {
    ctx += `\n\n## Datos de Argentina (en vivo)
- Dólar oficial: $${argentina.oficial?.venta ?? '?'} | Blue: $${argentina.blue?.venta ?? '?'} | MEP: $${argentina.mep?.venta ?? '?'} | CCL: $${argentina.ccl?.venta ?? '?'}
- Brecha oficial/blue: ${argentina.brecha?.toFixed(1) ?? '?'}%
- Riesgo país: ${argentina.riesgoPais?.valor ?? '?'} pb (al ${argentina.riesgoPais?.fecha ?? '?'})`
  }

  if (portfolio?.positions?.length) {
    ctx += `\n\n## Portfolio del usuario\n`
    for (const p of portfolio.positions) {
      const value = (p.currentPrice ?? p.entryPrice) * p.shares
      const pnl = p.currentPrice ? (((p.currentPrice / p.entryPrice) - 1) * 100).toFixed(1) : '?'
      ctx += `- ${p.ticker}: ${p.shares} acciones, entrada $${p.entryPrice}, actual $${p.currentPrice ?? '?'} (${pnl}%), valor $${value.toFixed(0)}\n`
    }
    if (portfolio.cash != null) ctx += `- Cash disponible: $${portfolio.cash}\n`
  } else {
    ctx += `\n\nEl usuario todavía no cargó posiciones en su portfolio.`
  }

  return ctx
}

// POST /api/chat  { messages: [{role, content}], portfolio?: {...} }
router.post('/', async (req, res, next) => {
  try {
    if (!anthropic) return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada' })

    const { messages = [], portfolio = null } = req.body
    if (!messages.length) return res.status(400).json({ error: 'messages requerido' })

    const argentina = await getContextoArgentina()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(portfolio, argentina),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
    res.json({ reply: text })
  } catch (err) { next(err) }
})

export default router
