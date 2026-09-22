import { useEffect, useState } from 'react'
import api from '../../services/api'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import type { ProductWithVariant } from '../../types'

interface RelatedProductsProps {
  productId: string
  categoryId?: string | null
  brandId?: string | null
}

// "You May Also Like" — deterministic catalogue-similarity picks computed
// server-side (category / brand / price band / storage+RAM scoring). Renders
// nothing when there is nothing honest to suggest.
export default function RelatedProducts({ productId, categoryId, brandId }: RelatedProductsProps) {
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return
    let active = true
    setLoading(true)
    api.get(`/products/${productId}/related?limit=8`)
      .then(r => { if (active) setProducts(r.data?.data || []) })
      .catch(() => { if (active) setProducts([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [productId])

  if (loading) {
    return (
      <section aria-label="Related products">
        <div>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
            <span className="eyebrow">Related products</span>
          </span>
          <h2 className="section-heading mt-3">You May Also Like</h2>
        </div>
        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:grid sm:mx-0 sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <ProductCardSkeleton key={i} />)}
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section aria-labelledby="related-heading">
      <div>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
          <span className="eyebrow">Related products</span>
        </span>
        <h2 id="related-heading" className="section-heading mt-3">You May Also Like</h2>
        <p className="section-subheading">
          Similar certified devices from the same catalogue{categoryId && brandId ? ' — same category & brand' : ''}.
        </p>
      </div>
      <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:grid sm:mx-0 sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} className="h-full w-full" />
        ))}
      </div>
    </section>
  )
}