import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, RefreshCw } from 'lucide-react'
import { useCartStore, MAX_QUANTITY_PER_ITEM } from '../../stores/cartStore'
import { formatPrice } from '../../utils'
import { settingsService } from '../../services/settings.service'
import api from '../../services/api'
import ProductImage from '../../components/shop/ProductImage'

export default function CartPage() {
  const { items, removeItem, updateQuantity, refreshItem, getTotal, getItemCount, clearCart } = useCartStore()
const [shippingConfig, setShippingConfig] = useState({ freeShippingThreshold: 999, standardShipping: 99 })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null)

  useEffect(() => {
    settingsService.getSettings().then(r => {
      const s = r.data
      const map: Record<string, string> = {}
      if (Array.isArray(s)) s.forEach((item: any) => { map[item.key] = item.value })
      else if (typeof s === 'object') Object.assign(map, s)
      setShippingConfig({
        freeShippingThreshold: parseInt(map.free_shipping_threshold) || 999,
        standardShipping: parseInt(map.standard_shipping_price) || 99,
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (items.length === 0) return
    let cancelled = false
    setRefreshing(true)
    setRefreshWarning(null)
    Promise.all(items.map(item =>
      api.get(`/products/by-variant/${item.variantId}`)
        .then(r => ({ item, ok: true as const, data: r.data.data }))
        .catch(e => ({ item, ok: false as const, status: (e?.response?.status ?? null) as number | null }))
    )).then(results => {
      if (cancelled) return
      let removed = 0
      const unverified: string[] = []
      results.forEach(r => {
        if (r.ok) {
          const v = r.data && r.data.variants && r.data.variants[0]
          if (!v) {
            removeItem(r.item.variantId)
            removed++
            return
          }
          const stock = Math.max(0, Number(v.stock) || 0)
          const price = Math.max(0, Number(v.price) || 0)
          const discountPrice = v.discountPrice != null && Number(v.discountPrice) >= 0 ? Number(v.discountPrice) : null
          refreshItem(r.item.variantId, { price, discountPrice, stock })
          if (stock === 0) {
            removeItem(r.item.variantId)
            removed++
            return
          }
          const capped = Math.min(r.item.quantity, stock, MAX_QUANTITY_PER_ITEM)
          if (capped !== r.item.quantity) updateQuantity(r.item.variantId, capped)
        } else if (r.status === 404) {
          // Variant is gone from the catalog — keeping it would make checkout impossible.
          removeItem(r.item.variantId)
          removed++
        } else {
          // Network/server hiccup — the item is almost certainly still valid; keep it
          // and surface a warning instead of silently wiping the cart.
          unverified.push(r.item.name)
        }
      })
      if (removed > 0) toast.error(`${removed} item${removed === 1 ? '' : 's'} removed from your cart — no longer available`)
      if (unverified.length > 0) {
        setRefreshWarning(`Couldn't verify ${unverified.length} item${unverified.length === 1 ? '' : 's'} (${unverified.join(', ')}) — prices may be stale.`)
      }
    }).finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><ShoppingBag className="h-7 w-7" /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Start shopping to add items to your cart.</p>
        <Link to="/products" className="btn-primary mt-6 inline-flex">
          <ChevronRight className="mr-1 h-4 w-4" /> Continue Shopping
        </Link>
      </div>
    )
  }

  const shipping = getTotal() >= shippingConfig.freeShippingThreshold ? 0 : shippingConfig.standardShipping
  const total = getTotal() + shipping

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-8 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Shopping Cart ({getItemCount()} items)</h1>

      {refreshing && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-800">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking latest prices & stock…
        </div>
      )}

      {refreshWarning && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span>{refreshWarning}</span>
          <button onClick={() => { setRefreshing(true); setRefreshWarning(null); window.location.reload() }} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh prices
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Cart Items */}
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.variantId} className="card flex gap-4 p-4">
              <Link to={`/products/${item.productId}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <ProductImage src={item.image} alt={item.name} className="h-full" imgClassName="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link to={`/products/${item.productId}`} className="text-sm font-medium text-gray-900 hover:text-navy-700">
                    {item.name}
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{formatPrice(item.discountPrice ?? item.price)}</span>
{item.discountPrice != null && item.discountPrice < item.price && (
                      <span className="text-xs text-gray-500 line-through">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Decrease quantity" className="flex h-11 w-11 items-center justify-center rounded-lg border hover:bg-navy-50">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= Math.min(item.stock, MAX_QUANTITY_PER_ITEM)} aria-label="Increase quantity" className="flex h-11 w-11 items-center justify-center rounded-lg border hover:bg-gray-50 disabled:opacity-40">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPrice((item.discountPrice ?? item.price) * item.quantity)}</span>
                    <button onClick={() => removeItem(item.variantId)} aria-label={`Remove ${item.name} from cart`} className="flex h-11 w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
<button
            onClick={() => {
              if (window.confirm(`Clear all ${getItemCount()} items from your cart?`)) clearCart()
            }}
            className="relative z-10 min-h-[44px] px-2 text-sm text-red-500 transition-colors hover:text-red-700"
          >
            Clear Cart
          </button>
        </div>

        {/* Order Summary */}
        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal ({getItemCount()} items)</span>
              <span className="font-medium">{formatPrice(getTotal())}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span className="font-medium">{shipping === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(shipping)}</span>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-gray-400">Free shipping on orders above {formatPrice(shippingConfig.freeShippingThreshold)}</p>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary mt-6 block text-center">
            Proceed to Checkout
          </Link>
          <Link to="/products" className="btn-secondary mt-3 block text-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
