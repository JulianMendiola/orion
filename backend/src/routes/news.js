import { Router } from 'express'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

const router  = Router()
const parser  = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' })

const yf2 = axios.create({
  baseURL: 'https://query2.finance.yahoo.com',
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; orion-app/1.0)' },
  timeout: 8000,
})

const rssClient = axios.create({
  timeout: 7000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
})

// ── Fuentes RSS argentinas ───────────────────────────────
const AR_SOURCES = [
  { name: 'Ámbito',      url: 'https://www.ambito.com/rss.xml',                                          country: 'AR' },
  { name: 'iProfesional', url: 'https://e.infopro.com.ar/rss/ultimasnoticias.xml',                       country: 'AR' },
  { name: 'El Cronista',  url: 'https://www.cronista.com/files/feeds/noticias.xml',                       country: 'AR' },
  { name: 'Infobae Eco',  url: 'https://www.infobae.com/feeds/rss/economia-y-negocios.xml',               country: 'AR' },
]

function extractText(val) {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (val.__cdata) return val.__cdata.trim()
  if (val['#text']) return val['#text'].trim()
  return String(val).trim()
}

async function fetchRSS(source) {
  try {
    const { data } = await rssClient.get(source.url)
    const parsed = parser.parse(data)
    const items  = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? []
    const arr    = Array.isArray(items) ? items : [items]

    return arr.slice(0, 8).map((item, i) => {
      const title = extractText(item.title)
      const link  = extractText(item.link) || extractText(item.guid) || ''
      const date  = extractText(item.pubDate) || extractText(item.updated) || ''
      const time  = date ? Math.floor(new Date(date).getTime() / 1000) : (Date.now() / 1000 - i * 300)
      return {
        id:        `${source.name}-${i}-${title.slice(0,20)}`.replace(/\s/g, '-'),
        title,
        publisher: source.name,
        url:       link.startsWith('http') ? link : `https://${link}`,
        time:      isNaN(time) ? Date.now() / 1000 : time,
        ticker:    'AR',
        thumbnail: null,
        country:   source.country,
      }
    }).filter(n => n.title && n.url.startsWith('http'))
  } catch { return [] }
}

// GET /api/news?tickers=META,LLY
router.get('/', async (req, res, next) => {
  try {
    const tickers = (req.query.tickers ?? 'SPY,AAPL,NVDA,META').split(',').filter(Boolean)

    // Yahoo Finance news + RSS argentinas en paralelo
    const [yahooResults, ...rssResults] = await Promise.all([
      Promise.all(tickers.map(async t => {
        try {
          const { data } = await yf2.get('/v1/finance/search', {
            params: { q: t, newsCount: 5, quotesCount: 0 },
          })
          return (data?.news ?? []).map(n => ({ ...n, queryTicker: t }))
        } catch { return [] }
      })),
      ...AR_SOURCES.map(fetchRSS),
    ])

    // Procesar noticias Yahoo
    const seen = new Set()
    const yahooNews = yahooResults
      .flat()
      .filter(n => {
        if (!n.uuid || seen.has(n.uuid)) return false
        seen.add(n.uuid)
        return true
      })
      .map(n => ({
        id:        n.uuid,
        title:     n.title,
        publisher: n.publisher,
        url:       n.link,
        time:      n.providerPublishTime,
        ticker:    n.queryTicker,
        thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? null,
        country:   'US',
      }))

    // Mezclar: noticias argentinas primero, luego internacionales
    const arNews = rssResults.flat()
    const allNews = [...arNews, ...yahooNews]
      .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      .slice(0, 30)

    res.json(allNews)
  } catch (err) { next(err) }
})

export default router
