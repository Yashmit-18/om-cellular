import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Trash2, ArrowRight } from 'lucide-react'
import { useCompareStore } from '../../stores/compareStore'
import { COMPARE_MAX } from '../../utils/discovery/compare'
import api from '../../services/api'
import { getImageList, cn } from '../../utils'
import type { ProductWithVariant } from '../../types'

// Global compare selection dock. Renders as a floating pill above the bottom
// nav / WhatsApp FAB so it can't be accidentally overlapped; hidden via the
// layout on pages that already carry the full compare table, cart or checkout.
export default function CompareBar() {
  const items = useCompareStore(s => s.items)
  const remove = useCompareStore(s => s.remove)
  const clear = useCompareStore(s => s.clear)

  const ids = items
  const [products, setProducts] = useState<ProductWithVariant[]>([])

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); return }
    let active = true
    api.get(`/products?ids=${encodeURIComponent(ids.join(','))}&limit=${ids.length}`)
      .then(r => {
        if (!active) return
        const list: ProductWithVariant[] = r.data?.data || []
        const byId = new Map(list.map(p => [p.id, p]))
        setProducts(ids.map(id => byId.get(id)).filter((p): p is ProductWithVariant => Boolean(p)))
      })
      .catch(() => { if (active) setProducts([]) })
    return () => { active = false }
  }, [ids])

  const thumb = useMemo(() => (id: string) => {
    const product = products.find(p => p.id === id)
    return product ? getImageList(product.primaryImage)[0] : ''
  }, [products])

  if (items.length === 0) return null

  const hint = items.length < 2 ? 'Add another product to compare' : `${items.length} products ready to compare`

  return (
    <div className="fixed left-1/2 z-50 w-[min(100%-2rem,26rem)] -translate-x-1/2 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] md:bottom-8">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/95 py-2 pl-2 pr-2 shadow-elevated backdrop-blur">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-200" aria-hidden="true">
          <Scale className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-center -space-x-2.5">
          {ids.map(id => {
            const src = thumb(id)
            return (
              <div key={id} className="group relative shrink-0">
                <button
                  onClick={() => remove(id)}
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-ivory-50 shadow-sm transition-transform hover:scale-105"
                  aria-label={`Remove from compare`}
                >
                  {src ? (
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Scale className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">
                  <Trash2 className="h-2.5 w-2.5" />
                </span>
              </div>
            )
          })}
        </div>
        <Link
          to="/compare"
          className={cn(
            'inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold transition-colors',
            items.length >= 2
              ? 'bg-navy-900 text-white hover:bg-navy-950'
              : 'bg-navy-100 text-navy-700 hover:bg-navy-200',
          )}
          aria-label={`Compare ${items.length} products`}
        >
          <span className="hidden sm:inline">{items.length >= 2 ? `Compare (${items.length})` : hint}</span>
          <span className="sm:hidden">Compare</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          onClick={clear}
          className="hidden shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:inline-flex"
          aria-label="Clear compare selection"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] font-medium text-gray-500">
        Compare up to {COMPARE_MAX} products {hint && items.length >= 2 ? '· ' + hint : ''}
      </p>
    </div>
  )
}