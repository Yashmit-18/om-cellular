import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import { formatPrice } from '../../utils'
import { settingsService } from '../../services/settings.service'

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } = useCartStore()
  const [shippingConfig, setShippingConfig] = useState({ freeShippingThreshold: 999, standardShipping: 99 })

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

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
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
      <h1 className="text-2xl font-bold">Shopping Cart ({getItemCount()} items)</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Cart Items */}
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.variantId} className="card flex gap-4 p-4">
              <Link to={`/products/${item.productId}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link to={`/products/${item.productId}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">
                    {item.name}
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{formatPrice(item.discountPrice || item.price)}</span>
                    {item.discountPrice && item.discountPrice < item.price && (
                      <span className="text-xs text-gray-400 line-through">{formatPrice(item.price)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Decrease quantity" className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-gray-50">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= item.stock} aria-label="Increase quantity" className="flex h-10 w-10 items-center justify-center rounded-lg border hover:bg-gray-50 disabled:opacity-40">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold">{formatPrice((item.discountPrice || item.price) * item.quantity)}</span>
                    <button onClick={() => removeItem(item.variantId)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700">
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
