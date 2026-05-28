import { useState } from 'react'
import { X, Upload, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fmt } from '@/utils/formatters'
import clsx from 'clsx'

// ── Parser universal ──────────────────────────────────────
function detectSeparator(line) {
  if ((line.match(/\t/g) || []).length >= 2) return '\t'
  if ((line.match(/;/g)  || []).length >= 2) return ';'
  return ','
}

function cleanNum(str) {
  if (!str) return NaN
  // Handle Argentine format: 1.234,56 → 1234.56
  const s = String(str).trim().replace(/['"$%\s]/g, '')
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return parseFloat(s.replace(',', '.'))
}

const COL_PATTERNS = {
  ticker: /especie|ticker|activo|symbol|instrumento|papel|codigo|nemotec/i,
  shares: /cantidad|tenencia|shares|acciones|posicion|unidades|nominal|qty/i,
  price:  /precio.*(prom|comp|entrada|cost|orig)|prom.*precio|costo|avg.*price|purchase|paid/i,
  date:   /fecha|date/i,
}

function parsePortfolioText(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { rows: [], headers: [], colMap: {}, error: 'Necesitás al menos 2 líneas (encabezado + datos).' }

  const sep  = detectSeparator(lines[0])
  const all  = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')))

  // Find header row: first row with a recognizable column name
  let headerIdx = all.findIndex(r =>
    r.some(c => COL_PATTERNS.ticker.test(c) || COL_PATTERNS.shares.test(c))
  )
  if (headerIdx < 0) headerIdx = 0  // assume first row is header

  const headers  = all[headerIdx]
  const dataRows = all.slice(headerIdx + 1).filter(r => r.some(c => c.trim()))

  // Map column indices
  const colMap = {}
  headers.forEach((h, i) => {
    for (const [key, pat] of Object.entries(COL_PATTERNS)) {
      if (!colMap[key] && pat.test(h)) colMap[key] = i
    }
  })

  // Fallback: positional guess if no headers matched
  if (colMap.ticker === undefined) colMap.ticker = 0
  if (colMap.shares === undefined) colMap.shares = 1
  if (colMap.price  === undefined) colMap.price  = 2

  const today = new Date().toISOString().slice(0, 10)
  const rows = dataRows.map((r, i) => {
    const rawTicker = r[colMap.ticker] ?? ''
    // Normalize CEDEARs: META → META, METAC → META (some brokers append C for CEDEAR)
    const ticker = rawTicker.toUpperCase().replace(/C$/, '').trim()
    const shares = cleanNum(r[colMap.shares])
    const price  = cleanNum(r[colMap.price])
    const date   = colMap.date !== undefined && r[colMap.date]
      ? r[colMap.date].split('/').reverse().join('-') // dd/mm/yyyy → yyyy-mm-dd
      : today
    return {
      _id:   i,
      ticker,
      rawTicker: rawTicker.toUpperCase(),
      shares,
      price,
      date,
      valid: !!ticker && !isNaN(shares) && shares > 0 && !isNaN(price) && price > 0,
    }
  }).filter(r => r.ticker)

  return { rows, headers, colMap, error: null }
}

// ── Examples ────────────────────────────────────────────
const EXAMPLES = {
  'Cocos Capital': `Especie;Cantidad;Precio Promedio;Precio Actual;Resultado
YPFD;1000;950,50;975,00;24500,00
META;10;620,00;612,34;-76,60
NU;50;14,50;15,20;35,00`,

  'IOL / CSV genérico': `ticker,shares,avg_price
AAPL,5,185.00
NVDA,3,480.50
GOOGL,2,170.00`,

  'Excel (tab)': `Activo\tTenencia\tP. Promedio\tFecha
SPY\t2\t520,00\t15/01/2026
QQQ\t3\t440,50\t20/02/2026`,
}

// ── Modal ────────────────────────────────────────────────
export default function ImportPortfolioModal({ onClose }) {
  const { addTransaction } = usePortfolioStore()
  const [text, setText]   = useState('')
  const [parsed, setParsed] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [showExamples, setShowExamples] = useState(false)
  const [done, setDone]   = useState(false)

  const parse = () => {
    const result = parsePortfolioText(text)
    setParsed(result)
    setSelected(new Set(result.rows.filter(r => r.valid).map(r => r._id)))
  }

  const toggleRow = (id) => {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const importSelected = () => {
    const toImport = parsed.rows.filter(r => selected.has(r._id) && r.valid)
    for (const r of toImport) {
      addTransaction({
        type:   'BUY',
        ticker: r.ticker,
        date:   r.date,
        shares: r.shares,
        price:  r.price,
        notes:  'Importado desde broker',
      })
    }
    setDone(true)
    setTimeout(onClose, 1200)
  }

  const validSelected = parsed?.rows.filter(r => selected.has(r._id) && r.valid) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-base">Importar portafolio</h2>
            <p className="font-mono text-xs text-muted mt-0.5">Cocos Capital · IOL · Bull Market · CSV / Excel</p>
          </div>
          <button onClick={onClose} className="text-muted2 hover:text-txt transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 size={40} className="text-buy" strokeWidth={1.5} />
              <p className="font-mono text-sm text-buy">¡Portafolio importado correctamente!</p>
            </div>
          ) : (
            <>
              {/* Step 1: paste */}
              {!parsed && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">
                        Pegá el CSV o tabla copiada de tu broker
                      </label>
                      <button
                        onClick={() => setShowExamples(e => !e)}
                        className="flex items-center gap-1 font-mono text-[0.6rem] text-muted hover:text-buy transition-colors"
                      >
                        Ver ejemplos <ChevronDown size={10} className={showExamples ? 'rotate-180' : ''} />
                      </button>
                    </div>

                    {showExamples && (
                      <div className="mb-3 grid grid-cols-1 gap-2">
                        {Object.entries(EXAMPLES).map(([name, ex]) => (
                          <div key={name} className="bg-s2 rounded-xl p-3 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-xs text-muted2 font-medium">{name}</span>
                              <button
                                onClick={() => { setText(ex); setShowExamples(false) }}
                                className="font-mono text-[0.6rem] text-buy hover:underline"
                              >
                                Usar este
                              </button>
                            </div>
                            <pre className="font-mono text-[0.6rem] text-muted whitespace-pre-wrap">{ex}</pre>
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder={`Desde Cocos Capital: exportá tu cartera → copiá y pegá aquí\n\nO pegá directamente desde Excel con Ctrl+C / Ctrl+V\n\nFormatos soportados: CSV (,  ;  tab), Excel, Cocos, IOL, Bull Market`}
                      className="w-full h-44 bg-s2 border border-border rounded-xl px-4 py-3 font-mono text-xs text-txt placeholder:text-muted outline-none focus:border-buy/50 transition-colors resize-none"
                      autoFocus
                    />
                  </div>

                  <div className="bg-s2 rounded-xl px-4 py-3 space-y-1">
                    <p className="font-mono text-[0.6rem] text-muted uppercase tracking-wider mb-2">Cómo exportar desde Cocos Capital</p>
                    <p className="font-mono text-xs text-muted2">1. Abrí la app o web de Cocos Capital</p>
                    <p className="font-mono text-xs text-muted2">2. Entrá a tu portafolio → buscá el botón "Exportar" o "Descargar CSV"</p>
                    <p className="font-mono text-xs text-muted2">3. Abrí el archivo, seleccioná todo (Ctrl+A) y copiá (Ctrl+C)</p>
                    <p className="font-mono text-xs text-muted2">4. Pegá acá arriba</p>
                  </div>
                </>
              )}

              {/* Step 2: preview */}
              {parsed && (
                <>
                  {parsed.error ? (
                    <div className="flex items-start gap-3 bg-sell/10 border border-sell/20 rounded-xl p-4">
                      <AlertCircle size={16} className="text-sell shrink-0 mt-0.5" />
                      <div>
                        <p className="font-mono text-sm text-sell">{parsed.error}</p>
                        <button onClick={() => setParsed(null)} className="font-mono text-xs text-muted hover:text-buy mt-2">
                          ← Volver a editar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-txt font-medium">
                            {parsed.rows.filter(r => r.valid).length} posiciones detectadas
                          </p>
                          <p className="font-mono text-xs text-muted mt-0.5">
                            Seleccioná las que querés importar
                          </p>
                        </div>
                        <button onClick={() => setParsed(null)} className="font-mono text-xs text-muted hover:text-buy transition-colors">
                          ← Editar texto
                        </button>
                      </div>

                      <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-s2">
                              <th className="w-10 px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={selected.size === parsed.rows.filter(r=>r.valid).length}
                                  onChange={e => setSelected(e.target.checked
                                    ? new Set(parsed.rows.filter(r=>r.valid).map(r=>r._id))
                                    : new Set()
                                  )}
                                  className="accent-buy"
                                />
                              </th>
                              {['Ticker', 'Acciones', 'Precio entrada', 'Total', ''].map(h => (
                                <th key={h} className="font-mono text-[0.55rem] text-muted uppercase tracking-wider text-left px-3 py-2.5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.rows.map(r => (
                              <tr
                                key={r._id}
                                onClick={() => r.valid && toggleRow(r._id)}
                                className={clsx(
                                  'border-b border-border/50 transition-colors',
                                  r.valid ? 'cursor-pointer hover:bg-s2' : 'opacity-40',
                                  selected.has(r._id) && r.valid ? 'bg-buy/5' : ''
                                )}
                              >
                                <td className="px-3 py-2.5">
                                  {r.valid && (
                                    <input
                                      type="checkbox"
                                      checked={selected.has(r._id)}
                                      onChange={() => toggleRow(r._id)}
                                      onClick={e => e.stopPropagation()}
                                      className="accent-buy"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-mono text-sm font-medium text-txt">{r.ticker}</div>
                                  {r.rawTicker !== r.ticker && (
                                    <div className="font-mono text-[0.55rem] text-muted">raw: {r.rawTicker}</div>
                                  )}
                                </td>
                                <td className="font-mono text-xs text-muted2 px-3 py-2.5">
                                  {isNaN(r.shares) ? <span className="text-sell">✗ inválido</span> : r.shares}
                                </td>
                                <td className="font-mono text-xs text-muted2 px-3 py-2.5">
                                  {isNaN(r.price) ? <span className="text-sell">✗ inválido</span> : fmt.usd(r.price)}
                                </td>
                                <td className="font-mono text-xs text-txt px-3 py-2.5">
                                  {r.valid ? fmt.usd(r.shares * r.price) : '—'}
                                </td>
                                <td className="px-3 py-2.5">
                                  {!r.valid && (
                                    <span className="font-mono text-[0.55rem] text-sell bg-sell/10 px-2 py-0.5 rounded">
                                      datos incompletos
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {validSelected.length > 0 && (
                        <div className="bg-buy/5 border border-buy/20 rounded-xl px-4 py-3 flex justify-between items-center">
                          <div>
                            <p className="font-mono text-xs text-buy font-medium">{validSelected.length} posiciones a importar</p>
                            <p className="font-mono text-[0.6rem] text-muted mt-0.5">
                              Total: {fmt.usd(validSelected.reduce((s,r) => s + r.shares * r.price, 0))}
                            </p>
                          </div>
                          <p className="font-mono text-[0.6rem] text-muted">Fecha: hoy</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            {!parsed ? (
              <Button className="flex-1" onClick={parse} disabled={!text.trim()}>
                <Upload size={14} />
                Analizar
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={importSelected}
                disabled={validSelected.length === 0}
              >
                <Upload size={14} />
                Importar {validSelected.length > 0 ? `${validSelected.length} posiciones` : ''}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
