import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, Truck, Shield, ChevronRight, Minus, Plus, Zap, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { useWishlistStore } from '../../stores/wishlistStore'
import { useAuthStore } from '../../stores/authStore'
import { formatPrice, calculateDiscount, getImageList, cn } from '../../utils'
import ProductImage from '../../components/shop/ProductImage'
import type { Product, ProductVariant } from '../../types'

function parseArrayItems(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(v => (typeof v === 'string' ? v : v && typeof v === 'object' ? (v as any)?.value ?? JSON.stringify(v) : String(v)))
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parseArrayItems(parsed) : value ? [value] : []
    } catch { return value ? [value] : [] }
  }
  return []
}

function parseSpecs(value: unknown): [string, string][] {
  if (!value) return []
  if (Array.isArray(value)) {
    const entries: [string, string][] = []
    value.forEach(item => {
      if (item && typeof item === 'object') {
        const key = (item as any)?.key ?? (item as any)?.name ?? (item as any)?.label
        let val: any = (item as any)?.value ?? (item as any)?.description
        if (val == null) val = ''
        entries.push([String(key), String(val)])
      } else if (typeof item === 'string' && item.includes(':')) {
        const [k, ...rest] = item.split(':')
        entries.push([k.trim(), rest.join(':').trim()])
      }
    })
    return entries
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)])
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parseSpecs(parsed)
    } catch { return [] }
  }
  return []
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [touchX, setTouchX] = useState<number | null>(null)
  const addItem = useCartStore(s => s.addItem)
  const toggleItem = useWishlistStore(s => s.toggleItem)
  const hasItem = useWishlistStore(s => s.hasItem)
  const { user } = useAuthStore()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    api.get(`/products/${id}`).then(r => {
      setProduct(r.data.data)
      const variants = r.data.data?.variants?.filter((v: ProductVariant) => v.isActive) || []
      if (variants.length > 0) {
        setSelectedVariant(variants.find((v: ProductVariant) => v.stock > 0) || variants[0])
      }
      setSelectedImage(0)
      setLoading(false)
    }).catch(() => {
      setError(true)
      setLoading(false)
    })
  }, [id])

  const handleAddToCart = () => {
    if (!selectedVariant || !product) return
    if (selectedVariant.stock < quantity) {
      toast.error('Not enough stock')
      return
    }
    const images = getImageList(product.images, selectedVariant.images)
    addItem({
      id: product.id,
      variantId: selectedVariant.id,
      productId: product.id,
      name: `${product.name} - ${selectedVariant.name}`,
      slug: product.slug,
      image: images[0] || '/placeholder.svg',
      price: selectedVariant.price,
      discountPrice: selectedVariant.discountPrice,
      stock: selectedVariant.stock,
      quantity,
    })
    toast.success('Added to cart!')
  }

  const handleBuyNow = () => {
    if (!selectedVariant || !product) return
    if (selectedVariant.stock < quantity) {
      toast.error('Not enough stock')
      return
    }
    const images = getImageList(product.images, selectedVariant.images)
    addItem({
      id: product.id,
      variantId: selectedVariant.id,
      productId: product.id,
      name: `${product.name} - ${selectedVariant.name}`,
      slug: product.slug,
      image: images[0] || '/placeholder.svg',
      price: selectedVariant.price,
      discountPrice: selectedVariant.discountPrice,
      stock: selectedVariant.stock,
      quantity,
    })
    navigate('/checkout')
  }

  const handleWishlist = () => {
    if (!selectedVariant) return
    if (!user) {
      toast.error('Please login to add to wishlist')
      return
    }
    toggleItem(selectedVariant.id)
    toast.success(hasItem(selectedVariant.id) ? 'Added to wishlist' : 'Removed from wishlist')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-2xl bg-gray-100" />
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-100" />
            <div className="h-10 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-12 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Zap className="h-7 w-7" /></div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Product unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This product could not be found or is no longer available.</p>
        <Link to="/buy-phones" className="btn-primary mt-6 inline-flex">
          <ChevronRight className="mr-1 h-4 w-4" /> Browse phones
        </Link>
      </div>
    )
  }

  const variants = product.variants?.filter(v => v.isActive) || []
  const images = getImageList(product.images, selectedVariant?.images)
  const specs = parseSpecs(selectedVariant?.specifications)
  const whatsIncluded = parseArrayItems(selectedVariant?.whatsIncluded)
  const displayPrice = selectedVariant ? (selectedVariant.discountPrice || selectedVariant.price) : 0
  const lowestAny = variants.length > 0 ? Math.min(...variants.map(v => v.discountPrice || v.price)) : 0
  const highestAny = variants.length > 0 ? Math.max(...variants.map(v => v.discountPrice || v.price)) : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-900">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/buy-phones" className="hover:text-gray-900">Buy Phones</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/buy-phones?categoryId=${(product.category as any)?.id || (product.category as any)?._id}`} className="hover:text-gray-900">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-gray-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            onTouchStart={e => setTouchX(e.touches[0].clientX)}
            onTouchEnd={e => {
              if (touchX == null || images.length <= 1) return
              const dx = e.changedTouches[0].clientX - touchX
              if (Math.abs(dx) > 40) setSelectedImage(i => (i + (dx < 0 ? 1 : -1) + images.length) % images.length)
              setTouchX(null)
            }}
          >
            <ProductImage
              src={images[selectedImage]}
              alt={product.name}
              className="aspect-square rounded-2xl"
              imgClassName="transition-all duration-300"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn('shrink-0 overflow-hidden rounded-xl border-2 transition-colors', i === selectedImage ? 'border-brand-600' : 'border-transparent opacity-80 hover:opacity-100')}
                  aria-label={`View image ${i + 1}`}
                >
                  <ProductImage src={img} alt="" className="h-20 w-20 rounded-xl" />
                </button>
              ))}
            </div>
          )}
          {images.length === 0 && (
            <p className="mt-3 text-center text-xs text-gray-400">Product imagery coming soon</p>
          )}
        </div>

        {/* Details */}
        <div>
          {product.brand && <p className="text-sm font-medium uppercase tracking-wide text-gray-400">{product.brand.name}</p>}
          <h1 className="mt-1 text-2xl font-bold leading-tight text-gray-900 md:text-3xl">{product.name}</h1>

          {selectedVariant && (
            <>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-bold text-brand-600">{formatPrice(displayPrice)}</span>
                {selectedVariant.discountPrice && selectedVariant.discountPrice < selectedVariant.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">{formatPrice(selectedVariant.price)}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {calculateDiscount(selectedVariant.price, selectedVariant.discountPrice)}% off
                    </span>
                  </>
                )}
              </div>
              {variants.length > 1 && (
                <p className="mt-1 text-xs text-gray-500">Price range: {formatPrice(lowestAny)} - {formatPrice(highestAny)}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {selectedVariant.stock > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" /> In Stock ({selectedVariant.stock} available)
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">Free shipping</span>
                  </>
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">Out of Stock</span>
                )}
              </div>
            </>
          )}

          {/* Variant selection */}
          {variants.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Select variant</h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => { setSelectedVariant(variant); setSelectedImage(0); setQuantity(1) }}
                    className={cn(
                      'rounded-xl border-2 px-3.5 py-2 text-left text-sm font-medium transition-all',
                      selectedVariant?.id === variant.id
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <span className="block">{variant.storage || variant.name}</span>
                    <span className="block text-xs font-normal text-gray-500">
                      {[variant.ram, variant.color].filter(Boolean).join(' · ') || variant.name}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-brand-600">
                      {formatPrice(variant.discountPrice || variant.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          {selectedVariant && selectedVariant.stock > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <h3 className="text-sm font-semibold text-gray-900">Quantity</h3>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-1.5">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Decrease quantity">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50" aria-label="Increase quantity">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 hidden flex-col gap-3 sm:flex sm:flex-row">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock <= 0}
              className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </button>
            {selectedVariant && selectedVariant.stock > 0 && (
              <button onClick={handleBuyNow} className="btn-secondary flex-1">
                <Zap className="mr-2 h-4 w-4 text-amber-500" /> Buy Now
              </button>
            )}
            <button
              onClick={handleWishlist}
              disabled={!selectedVariant}
              className={cn('rounded-xl border px-4 transition-colors disabled:opacity-40', selectedVariant && hasItem(selectedVariant.id) ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600')}
              aria-label="Toggle wishlist"
            >
              <Heart className={cn('h-5 w-5', selectedVariant && hasItem(selectedVariant.id) && 'fill-current')} />
            </button>
          </div>

          {/* Product details (SKU / condition) */}
          {(selectedVariant?.sku || selectedVariant?.condition || product.condition) && (
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm">
              {selectedVariant?.sku && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">SKU</dt>
                  <dd className="truncate font-medium text-gray-900">{selectedVariant.sku}</dd>
                </div>
              )}
              {(selectedVariant?.condition || product.condition) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Condition</dt>
                  <dd className="font-medium text-gray-900">{selectedVariant?.condition || product.condition}</dd>
                </div>
              )}
              {product.brand && (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Brand</dt>
                  <dd className="font-medium text-gray-900">{product.brand.name}</dd>
                </div>
              )}
            </dl>
          )}

          {/* Badges */}
          {(product.isFeatured || product.isNewArrival || product.isBestSeller || selectedVariant?.badge) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.isFeatured && <span className="badge-info badge">Featured</span>}
              {product.isNewArrival && <span className="badge badge bg-purple-100 text-purple-800">New Arrival</span>}
              {product.isBestSeller && <span className="badge badge bg-amber-100 text-amber-800">Best Seller</span>}
              {selectedVariant?.badge && <span className="badge badge bg-emerald-100 text-emerald-800">{selectedVariant.badge}</span>}
            </div>
          )}

          {/* Trust */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-sm"><Truck className="h-4 w-4 shrink-0 text-brand-500" /> Free Shipping</div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 text-sm"><Shield className="h-4 w-4 shrink-0 text-brand-500" /> {product.warranty || 'Warranty Included'}</div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Description</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {specs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Specifications</h3>
              <dl className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="text-gray-500">{key}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* What's Included */}
          {whatsIncluded.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">What&apos;s Included</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                {whatsIncluded.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-gray-400" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Return Policy */}
          {product.returnPolicy && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <strong>Return Policy:</strong> {product.returnPolicy}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar (above bottom nav) */}
      <div className="fixed inset-x-0 bottom-20 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90 pb-safe sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{selectedVariant?.name || product.name}</p>
            <p className="text-lg font-bold text-brand-600">{formatPrice(displayPrice)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            className="btn-secondary min-w-[110px] flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" /> Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            className="btn-primary min-w-[96px] flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zap className="mr-1.5 h-4 w-4 text-amber-300" /> Buy Now
          </button>
        </div>
      </div>
    </div>
  )
}