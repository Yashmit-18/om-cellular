import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, ArrowRight, Scale, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatPrice, getConditionLabel, getStockStatus, calculateDiscount } from '../../utils'
import ProductImage from './ProductImage'
import { useCartStore } from '../../stores/cartStore'
import { useWishlist } from '../../hooks/useWishlist'
import { useCompareStore } from '../../stores/compareStore'
import type { ProductWithVariant, ProductVariant } from '../../types'

interface VariantFilter {
  storages?: string[]
  rams?: string[]
  colors?: string[]
  conditions?: string[]
}

interface ProductCardProps {
  product: ProductWithVariant
  variant?: 'grid' | 'list'
  showWishlist?: boolean
  className?: string
  variantFilter?: VariantFilter
}

function effectivePrice(v: ProductVariant): number {
  const p = Number(v.price) || 0
  const dp = v.discountPrice != null ? Number(v.discountPrice) : null
  return dp !== null && dp < p ? dp : p
}

function cheapestVariant(vs: ProductVariant[]): ProductVariant | null {
  if (vs.length === 0) return null
  return vs.reduce((best, v) => (effectivePrice(v) < effectivePrice(best) ? v : best), vs[0])
}

function inStockVariant(vs: ProductVariant[]): ProductVariant | null {
  const inStock = vs.filter(v => (Number(v.stock) || 0) > 0)
  if (inStock.length === 0) return null
  return inStock.reduce((best, v) => (effectivePrice(v) < effectivePrice(best) ? v : best), inStock[0])
}

function totalStock(vs: ProductVariant[]): number {
  return vs.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
}

// Restricts a product's variants to those satisfying the active storage/RAM/
// colour/condition filters, mirroring the server's variant-scoped matching for
// price display and quick-add (so a "256GB" listing never adds the 128GB unit).
function matchesFilter(v: ProductVariant, filter?: VariantFilter): boolean {
  if (!filter) return true
  if (filter.storages?.length && !filter.storages.includes(v.storage ?? '')) return false
  if (filter.rams?.length && !filter.rams.includes(v.ram ?? '')) return false
  if (filter.colors?.length && !filter.colors.includes(v.color ?? '')) return false
  if (filter.conditions?.length && !filter.conditions.includes(v.condition ?? '')) return false
  return true
}

export function ProductCard({ product, variant = 'grid', showWishlist = true, className, variantFilter }: ProductCardProps) {
  const addItem = useCartStore(s => s.addItem)
  const wishlist = useWishlist()
  const compareAdd = useCompareStore(s => s.add)
  const compareRemove = useCompareStore(s => s.remove)
  const compareHas = useCompareStore(s => s.has)

  const detailsTo = `/products/${product.slug || product.id}`
  const allVariants = product.variants || []
  const scopedVariants = allVariants.filter(v => matchesFilter(v, variantFilter))
  const best = cheapestVariant(scopedVariants)
  const buy = inStockVariant(scopedVariants)

  const current = best ? effectivePrice(best) : (product.lowestPrice ?? 0)
  const original = best ? Number(best.price) || 0 : 0
  const pct = current > 0 && original > current ? calculateDiscount(original, current) : 0

  const stockStatus = scopedVariants.length > 0
    ? getStockStatus(totalStock(scopedVariants))
    : (product.inStock ? 'in_stock' : 'out_of_stock')

  const condition = best?.condition || product.condition || null
  const meta = [best?.storage, best?.color, condition ? getConditionLabel(condition) : null]
    .filter(Boolean)
    .join(' · ')

  const categoryName = (product.category?.name || '').toLowerCase()
  const imageKind = categoryName.includes('tablet') ? 'tablet'
    : categoryName.includes('watch') ? 'watch'
    : categoryName.includes('accessor') ? 'headphones'
    : 'smartphone'

  const wishlistId = best?.id || ''
  const wished = showWishlist && wishlist.has(wishlistId)

  const toggleWishlist = () => {
    if (wishlistId) wishlist.toggle(wishlistId, product.name)
  }

  const comparing = compareHas(product.id)

  const toggleCompare = () => {
    if (comparing) {
      compareRemove(product.id)
      toast.success('Removed from compare')
      return
    }
    const category = product.category as any
    const categoryId = category?.id || category?._id || null
    const error = compareAdd(product.id, categoryId)
    if (error === 'duplicate') return
    if (error === 'max') {
      toast.error('You can compare up to 4 products at a time.')
      return
    }
    if (error === 'category') {
      toast.error('Comparison works within the same category. Clear your current selection first.')
      return
    }
    toast.success('Added to compare')
  }

  const handleAddToCart = () => {
    if (!buy) return
    addItem({
      id: buy.id,
      variantId: buy.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.primaryImage || '',
      price: Number(buy.price) || 0,
      discountPrice: buy.discountPrice != null && Number(buy.discountPrice) >= 0 ? Number(buy.discountPrice) : null,
      quantity: 1,
      stock: Number(buy.stock) || 0,
    })
    toast.success('Added to cart')
  }

  const stockPill =
    stockStatus === 'in_stock' ? { label: 'In Stock', cls: 'text-emerald-700', dot: 'bg-emerald-500' }
    : stockStatus === 'low_stock' ? { label: 'Low Stock', cls: 'text-amber-700', dot: 'bg-amber-500' }
    : { label: 'Out of Stock', cls: 'text-gray-500', dot: 'bg-gray-400' }

  const wishlistButton = showWishlist && (
    <button
      type="button"
      onClick={toggleWishlist}
      disabled={!wishlistId}
      aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      aria-pressed={wished}
      className={cn(
        'absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 ring-1 ring-black/5 backdrop-blur transition-all duration-200 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100',
        wished
          ? 'text-red-500 ring-red-200 hover:bg-red-50'
          : 'text-gray-400 hover:text-gray-600 hover:shadow-sm'
      )}
    >
      <Heart className={cn('h-5 w-5', wished && 'fill-current')} />
    </button>
  )

  const compareButton = (
    <button
      type="button"
      onClick={toggleCompare}
      aria-label={comparing ? `Remove ${product.name} from compare` : `Add ${product.name} to compare`}
      aria-pressed={comparing}
      className={cn(
        'absolute right-2 top-14 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 ring-1 ring-black/5 backdrop-blur transition-all duration-200 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100',
        comparing
          ? 'text-navy-900 ring-navy-300 bg-navy-50'
          : 'text-gray-400 hover:text-navy-700 hover:shadow-sm'
      )}
    >
      <Scale className="h-5 w-5" />
    </button>
  )

  const priceBlock = (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-lg font-extrabold tracking-tight text-navy-900">{formatPrice(current)}</span>
      {pct > 0 && original > 0 && (
        <>
          <span className="text-xs text-gray-400 line-through">{formatPrice(original)}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">{pct}% off</span>
        </>
      )}
    </div>
  )

  const ratingBlock = Number(product.ratingCount) > 0 && Number(product.rating) > 0 ? (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-600" aria-label={`${Number(product.rating).toFixed(1)} out of 5 from ${product.ratingCount} reviews`}>
      <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-500" aria-hidden="true" />
      <span className="font-semibold text-navy-800">{Number(product.rating).toFixed(1)}</span>
      <span>({product.ratingCount})</span>
    </div>
  ) : null

  const actions = (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      {buy ? (
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-950 hover:shadow-card-hover active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <ShoppingBag className="h-4 w-4" /> Add to Cart
        </button>
      ) : (
        <Link
          to={detailsTo}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-ivory-100 px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-ivory-200"
        >
          View Details
        </Link>
      )}
      <Link
        to={detailsTo}
        className="group/item hidden min-h-[44px] items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:border-navy-300 hover:text-navy-800 sm:inline-flex"
      >
        Details <ArrowRight className="h-4 w-4 transition-transform group-hover/item:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </div>
  )

  const stage = (
    <div className="relative w-full">
      <Link to={detailsTo} className="relative block overflow-hidden rounded-2xl bg-ivory-100">
        <ProductImage
          src={product.primaryImage}
          alt={product.name}
          contain
          kind={imageKind}
          className="relative h-[200px] sm:h-[240px] md:h-[250px] lg:h-[265px]"
          imgClassName="p-4 transition-[transform,opacity] duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
        />
      </Link>
      <span className={cn('absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold shadow-sm ring-1 ring-black/5 backdrop-blur', stockPill.cls)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', stockPill.dot)} /> {stockPill.label}
      </span>
      {wishlistButton}
      {compareButton}
    </div>
  )

  if (variant === 'list') {
    return (
      <div className={cn('card-premium group flex gap-4 rounded-2xl p-4 motion-reduce:transition-none motion-reduce:transform-none', className)}>
        <Link to={detailsTo} className="relative shrink-0 overflow-hidden rounded-xl bg-ivory-100">
          <ProductImage
            src={product.primaryImage}
            alt={product.name}
            contain
            kind={imageKind}
            className="h-28 w-28 sm:h-32 sm:w-32 rounded-xl"
            imgClassName="p-2 transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        </Link>
        <div className="min-w-0 flex-1">
          {product.brand?.name && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{product.brand.name}</p>
          )}
          <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900">
            <Link to={detailsTo} className="transition-colors hover:text-navy-900">{product.name}</Link>
          </h3>
          {meta && <p className="mt-1 truncate text-xs text-gray-400">{meta}</p>}
          {ratingBlock}
          {priceBlock}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {buy ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-navy-950 active:scale-[0.98] motion-reduce:transition-none"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </button>
            ) : (
              <Link to={detailsTo} className="btn-primary">View Details</Link>
            )}
            {showWishlist && (
              <button
                type="button"
                onClick={toggleWishlist}
                disabled={!wishlistId}
                aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                aria-pressed={wished}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 px-3.5 transition-colors hover:border-navy-300"
              >
                <Heart className={cn('h-5 w-5', wished ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleCompare}
              aria-label={comparing ? `Remove ${product.name} from compare` : `Add ${product.name} to compare`}
              aria-pressed={comparing}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center rounded-lg border px-3.5 transition-colors hover:border-navy-300',
                comparing ? 'border-navy-300 bg-navy-50 text-navy-900' : 'border-gray-200 text-gray-400 hover:text-navy-700'
              )}
            >
              <Scale className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card-premium group relative flex flex-col rounded-2xl p-3 motion-reduce:transition-none motion-reduce:transform-none sm:p-4', className)}>
      {stage}

      <div className="mt-3.5 flex flex-1 flex-col">
        {product.brand?.name && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{product.brand.name}</p>
        )}
        <h3 className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
          <Link to={detailsTo} className="transition-colors hover:text-navy-900">{product.name}</Link>
        </h3>
        {meta && <p className="mt-1 line-clamp-1 text-xs text-gray-400">{meta}</p>}
        {ratingBlock}
        {priceBlock}
        {actions}
      </div>
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="card-premium flex h-full flex-col p-3 sm:p-4">
      <div className="skeleton h-[200px] rounded-2xl sm:h-[240px] md:h-[250px] lg:h-[265px]" />
      <div className="mt-3.5 space-y-2">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-2/3" />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-4 w-10" />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="skeleton h-11 flex-1" />
        <div className="skeleton hidden h-11 w-28 sm:block" />
      </div>
    </div>
  )
}

export default ProductCard