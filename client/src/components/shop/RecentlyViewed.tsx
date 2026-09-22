import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { useRecentlyViewedStore } from '../../stores/recentlyViewedStore'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import type { ProductWithVariant } from '../../types'

interface RecentlyViewedProps {
  excludeId?: string
}

// Horizontal rail of the user's browsing trail (max 12, newest-first — rules
// in utils/discovery/recentlyViewed). Fetched in one batch via the products
// `ids` param so a long trail never fans out into N requests.
export default function RecentlyViewed({ excludeId }: RecentlyViewedProps) {
  const items = useRecentlyViewedStore(s => s.items)
  const ids = useMemo(() => items.filter(id => id !== excludeId).slice(0, 12), [items, excludeId])

  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); setProducts([]); return }
    let active = true
    setLoading(true)
    api.get(`/products?ids=${encodeURIComponent(ids.join(','))}&limit=${ids.length}`)
      .then(r => {
        if (!active) return
        const list: ProductWithVariant[] = r.data?.data || []
        const byId = new Map(list.map(p => [p.id, p]))
        // Preserve the browsing-trail order instead of relying on DB order.
        const ordered = ids.map(id => byId.get(id)).filter((p): p is ProductWithVariant => Boolean(p))
        setProducts(ordered)
      })
      .catch(() => { if (active) setProducts([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ids])

  if (ids.length === 0) return null

  if (loading) {
    return (
      <section aria-label="Recently viewed products">
        <div>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
            <span className="eyebrow">Your browsing trail</span>
          </span>
          <h2 className="section-heading mt-3">Recently Viewed</h2>
        </div>
        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:grid sm:mx-0 sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <ProductCardSkeleton key={i} />)}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed-heading">
      <div>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
          <span className="eyebrow">Your browsing trail</span>
        </span>
        <h2 id="recently-viewed-heading" className="section-heading mt-3">Recently Viewed</h2>
        <p className="section-subheading">Pick up where you left off.</p>
      </div>
      <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:grid sm:mx-0 sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} className="h-full w-full" />
        ))}
      </div>
    </section>
  )
}