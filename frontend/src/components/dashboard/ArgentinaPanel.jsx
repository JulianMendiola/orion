import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, SectionLabel, Skeleton } from '@/components/ui'
import { marketService } from '@/services/marketService'
import clsx from 'clsx'

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-AR')}` : '—'

function DolarRow({ label, casa }) {
  if (!casa) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="font-mono text-[0.65rem] text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted2">{fmt(casa.compra)}</span>
        <span className="font-mono text-xs font-semibold">{fmt(casa.venta)}</span>
      </div>
    </div>
  )
}

export default function ArgentinaPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setData(await marketService.getArgentina())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Argentina 🇦🇷</SectionLabel>
        <button onClick={load} disabled={loading} className="text-muted2 hover:text-buy transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} strokeWidth={2} />
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      )}

      {!loading && !data && (
        <p className="font-mono text-xs text-muted">Sin datos. Reintentá en unos minutos.</p>
      )}

      {!loading && data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[0.6rem] font-mono text-muted uppercase tracking-wider">
            <span>Dólar</span>
            <div className="flex gap-3"><span>Compra</span><span>Venta</span></div>
          </div>
          <div>
            <DolarRow label="Oficial" casa={data.oficial} />
            <DolarRow label="Blue"    casa={data.blue} />
            <DolarRow label="MEP"     casa={data.mep} />
            <DolarRow label="CCL"     casa={data.ccl} />
            <DolarRow label="Cripto"  casa={data.cripto} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div>
              <p className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Riesgo país</p>
              <p className={clsx('font-mono text-lg font-bold',
                (data.riesgoPais?.valor ?? 0) > 1000 ? 'text-sell' : (data.riesgoPais?.valor ?? 0) > 600 ? 'text-hold' : 'text-buy'
              )}>
                {data.riesgoPais?.valor ?? '—'} <span className="text-[0.6rem] text-muted font-normal">pb</span>
              </p>
            </div>
            {data.brecha != null && (
              <div className="text-right">
                <p className="font-mono text-[0.6rem] text-muted uppercase tracking-wider">Brecha</p>
                <p className="font-mono text-lg font-bold">{data.brecha.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
