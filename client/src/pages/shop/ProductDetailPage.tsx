import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Heart, Truck, Shield, ChevronRight, Star, Minus, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useCartStore } from '../../stores/cartStore'
import { useWishlistStore } from '../../stores/wishlistStore'
import { useAuthStore } from '../../stores/authStore'
import { formatPrice, calculateDiscount, getConditionLabel, cn } from '../../utils'
import type { Product, ProductVariant } from '../../types'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(s => s.addItem)
  const toggleItem = useWishlistStore(s => s.toggleItem)
  const hasItem = useWishlistStore(s => s.hasItem)
  const { user } = useAuthStore()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get(`/products/${id}`).then(r => {
      setProduct(r.data.data)
      const variants = r.data.data?.variants?.filter((v: ProductVariant) => v.isActive) || []
      if (variants.length > 0) {
        setSelectedVariant(variants.find((v: ProductVariant) => v.stock > 0) || variants[0])
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [id])

  const handleAddToCart = () => {
    if (!selectedVariant || !product) return
    if (selectedVariant.stock < quantity) {
      toast.error('Not enough stock')
      return
    }
    const images = JSON.parse(selectedVariant.images || '[]')
    addItem({
      id: product.id,
      variantId: selectedVariant.id,
      productId: product.id,
      name: `${product.name} - ${selectedVariant.name}`,
      slug: product.slug,
      image: images[0] || '/placeholder.png',
      price: selectedVariant.price,
      discountPrice: selectedVariant.discountPrice,
      stock: selectedVariant.stock,
      quantity,
    })
    toast.success('Added to cart!')
  }

  const handleWishlist = () => {
    if (!selectedVariant) return
    if (!user) {
      toast.error('Please login to add to wishlist')
      return
    }
    toggleItem(selectedVariant.id)
    toast.success(hasItem(selectedVariant.id) ? 'Removed from wishlist' : 'Added to wishlist')
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link to="/products" className="mt-4 inline-flex items-center text-brand-600">
          <ChevronRight className="mr-1 h-4 w-4" /> Back to products
        </Link>
      </div>
    )
  }

  const variants = product.variants?.filter(v => v.isActive) || []
  const images = selectedVariant ? JSON.parse(selectedVariant.images || '[]') : []
  const specs = selectedVariant ? JSON.parse(selectedVariant.specifications || '{}') : {}
  const whatsIncluded = selectedVariant ? JSON.parse(selectedVariant.whatsIncluded || '[]') : []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-900">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/products" className="hover:text-gray-900">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/products?categoryId=${product.category.id}`} className="hover:text-gray-900">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            <img
              src={images[selectedImage] || '/placeholder.png'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-2">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn('aspect-square overflow-hidden rounded-lg border-2', i === selectedImage ? 'border-brand-500' : 'border-transparent')}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.brand && <p className="text-sm text-gray-500">{product.brand.name}</p>}
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>

          {selectedVariant && (
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-brand-600">{formatPrice(selectedVariant.discountPrice || selectedVariant.price)}</span>
              {selectedVariant.discountPrice && selectedVariant.discountPrice < selectedVariant.price && (
                <>
                  <span className="text-lg text-gray-400 line-through">{formatPrice(selectedVariant.price)}</span>
                  <span className="badge-success badge">{calculateDiscount(selectedVariant.price, selectedVariant.discountPrice)}% off</span>
                </>
              )}
            </div>
          )}

          {selectedVariant && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              {selectedVariant.stock > 0 ? (
                <span className="text-emerald-600 font-medium">In Stock ({selectedVariant.stock} available)</span>
              ) : (
                <span className="text-red-600 font-medium">Out of Stock</span>
              )}
              {selectedVariant.condition && (
                <span className="badge-info badge">{getConditionLabel(selectedVariant.condition)}</span>
              )}
              {selectedVariant.soldCount > 0 && (
                <span className="text-gray-500">{selectedVariant.soldCount} sold</span>
              )}
            </div>
          )}

          {/* Variant Selection */}
          {variants.length > 1 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Select Variant</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => { setSelectedVariant(variant); setSelectedImage(0); setQuantity(1) }}
                    className={cn(
                      'rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors',
                      selectedVariant?.id === variant.id ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    {variant.name}
                    {variant.color && ` - ${variant.color}`}
                    {variant.storage && ` / ${variant.storage}`}
                    {variant.ram && ` / ${variant.ram}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          {selectedVariant && selectedVariant.stock > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock <= 0}
              className="btn-primary flex-1"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
            </button>
            <button onClick={handleWishlist} className={cn('rounded-lg border p-3', selectedVariant && hasItem(selectedVariant.id) ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50')}>
              <Heart className={cn('h-5 w-5', selectedVariant && hasItem(selectedVariant.id) && 'fill-current')} />
            </button>
          </div>

          {/* Badges */}
          <div className="mt-4 flex gap-2">
            {product.isFeatured && <span className="badge-info badge">Featured</span>}
            {product.isNewArrival && <span className="badge badge bg-purple-100 text-purple-800">New Arrival</span>}
            {product.isBestSeller && <span className="badge badge bg-amber-100 text-amber-800">Best Seller</span>}
            {selectedVariant?.badge && <span className="badge badge bg-emerald-100 text-emerald-800">{selectedVariant.badge}</span>}
          </div>

          {/* Trust */}
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-brand-500" /> Free Shipping</div>
            <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-brand-500" /> {product.warranty || 'Warranty Included'}</div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Description</h3>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {Object.keys(specs).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Specifications</h3>
              <dl className="mt-2 divide-y divide-gray-100">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 text-sm">
                    <dt className="text-gray-500">{key}</dt>
                    <dd className="font-medium text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* What's Included */}
          {whatsIncluded.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">What&apos;s Included</h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {whatsIncluded.map((item: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-gray-400" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Return Policy */}
          {product.returnPolicy && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              <strong>Return Policy:</strong> {product.returnPolicy}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
