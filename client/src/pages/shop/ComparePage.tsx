import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale, Trash2, X, AlertTriangle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useCompareStore } from '../../stores/compareStore'
import { COMPARE_MAX } from '../../utils/discovery/compare'
import { buildCompareSections, categoryGroupOf } from '../../utils/discovery/compareFields'
import { getImageList, formatPrice, cn } from '../../utils'
import type { ProductWithVariant } from '../../types'

export default function ComparePage() {
  const { items } = useCompareStore()
  const remove = useCompareStore(s => s.remove)
  const clear = useCompareStore(s => s.clear)

  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) { setLoading(false); setProducts([]); return }
    let active = true
    setLoading(true)
    api.get(`/products?ids=${encodeURIComponent(items.join(','))}&limit=${items.length}`)
      .then(r => {
        if (!active) return
        const list: ProductWithVariant[] = r.data?.data || []
        const byId = new Map(list.map(p => [p.id, p]))
        // Keep the user's selection order, dropping anything no longer listed.
        const ordered = items.map(id => byId.get(id)).filter((p): p is ProductWithVariant => Boolean(p))
        setProducts(ordered)
      })
      .catch(() => { if (active) setProducts([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [items])

  const handleRemove = (id: string) => {
    const product = products.find(p => p.id === id)
    remove(id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success(product ? `Removed ${product.name} from comparison` : 'Removed from comparison')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        <div className="mt-8 h-px bg-gray-100" />
        <div className="mt-8 space-y-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0 || products.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="card mx-auto max-w-md p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-gold-200"><Scale className="h-7 w-7" /></div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Nothing to compare yet</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Tap the compare icon on any product to build a side-by-side spec sheet. You can compare up to {COMPARE_MAX} products from the same category.
          </p>
          <Link to="/buy-phones" className="btn-primary mt-6 inline-flex">Browse Phones <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
        </div>
      </div>
    )
  }

  const groups = products.map(p => categoryGroupOf(p.category?.name))
  const mixedCategory = groups.some(g => g !== groups[0])
  const sections = buildCompareSections(products)
  const columnCount = products.length + 1

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
            <Scale className="h-3.5 w-3.5" /> Price · Specs · Side by side
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Compare Phones ({products.length})</h1>
          <p className="mt-1 text-sm text-gray-500">Fields that differ from the first product are highlighted.</p>
        </div>
        <button onClick={clear} className="btn-secondary !px-4 !py-2 text-sm"><Trash2 className="mr-1.5 h-4 w-4" /> Clear all</button>
      </div>

      {mixedCategory && (
        <div className="mt-6 flex flex-col items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> Your selection spans different categories — the spec sheet below can’t compare them fairly.</p>
          <button onClick={clear} className="shrink-0 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950">Start over</button>
        </div>
      )}

      <div className="no-scrollbar mt-8 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-card">
        <div
          className="grid"
          style={{ gridTemplateColumns: `minmax(9rem, 10rem) repeat(${products.length}, minmax(11rem, 1fr))`, minWidth: 720 }}
        >
          {/* Corner cell */}
          <div className="sticky left-0 z-20 border-b border-r border-gray-100 bg-ivory-50/95 p-3 backdrop-blur" aria-hidden="true" />

          {/* Product columns */}
          {products.map(product => {
            const image = getImageList(product.primaryImage)[0] || ''
            const range = product.highestPrice && product.highestPrice > product.lowestPrice
            return (
              <div key={product.id} className="flex flex-col border-b border-gray-100 p-3">
                <div className="relative">
                  <Link to={`/products/${product.id}`} className="block overflow-hidden rounded-xl border border-gray-100 bg-ivory-50">
                    {image ? (
                      <img src={image} alt="" className="aspect-[4/3] w-full object-contain" loading="lazy" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center text-gray-300"><Scale className="h-8 w-8" /></div>
                    )}
                  </Link>
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${product.name} from comparison`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Link to={`/products/${product.id}`} className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-gray-900 hover:text-navy-900">{product.name}</Link>
                <p className={cn('mt-1.5 text-sm font-bold', range ? 'text-navy-900' : 'text-gray-900')}>
                  {formatPrice(product.lowestPrice)}{range ? ` – ${formatPrice(product.highestPrice)}` : ''}
                </p>
                <p className={cn('mt-0.5 text-xs font-medium', product.inStock ? 'text-emerald-600' : 'text-amber-600')}>
                  {product.inStock ? 'In stock' : 'Out of stock'}
                </p>
              </div>
            )
          })}

          {/* Spec sections */}
          {sections.map(section => {
            const sectionBanner = (
              <div
                className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-navy-800"
                style={{ gridColumn: `1 / ${columnCount + 1}` }}
              >
                {section.name}
              </div>
            )
            const rows = section.rows.map(row => {
              const base = row.values[0]
              return (
                <div key={row.key} className="grid" style={{ gridColumn: `1 / ${columnCount + 1}`, gridTemplateColumns: 'inherit' }}>
                  <div className="sticky left-0 z-10 border-b border-r border-gray-100 bg-white px-3 py-2.5 text-xs font-semibold text-gray-500">{row.label}</div>
                  {row.values.map((value, idx) => {
                    const differs = value !== null && value !== base && base !== null
                    return (
                      <div key={idx} className={cn('border-b border-gray-50 px-3 py-2.5 text-xs leading-relaxed', differs ? 'font-semibold text-navy-900' : 'text-gray-600')}>
                        {value ?? <span className="text-gray-400">—</span>}
                      </div>
                    )
                  })}
                </div>
              )
            })
            return [sectionBanner, ...rows]
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Comparing {products.length} of {COMPARE_MAX} allowed products. Specs come straight from the catalogue — nothing is estimated.
      </p>
    </div>
  )
}