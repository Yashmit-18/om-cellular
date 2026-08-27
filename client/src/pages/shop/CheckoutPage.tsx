import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, CreditCard, Truck, ChevronRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { orderService } from '../../services/order.service'
import { couponService } from '../../services/coupon.service'
import { settingsService } from '../../services/settings.service'
import { formatPrice } from '../../utils'

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [addresses, setAddresses] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0.18)
  const [shippingConfig, setShippingConfig] = useState({ free: 999, standard: 99 })

  const subtotal = getTotal()
  const shipping = subtotal >= shippingConfig.free ? 0 : shippingConfig.standard
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = subtotal + shipping + tax - couponDiscount

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
      return
    }
    if (!user) {
      navigate('/login?redirect=/checkout')
      return
    }
    import('../../services/api').then(api => {
      api.default.get('/auth/me').then(r => {
        const addrs = r.data.data?.addresses || []
        setAddresses(addrs)
        const defaultAddr = addrs.find((a: any) => a.isDefault)
        if (defaultAddr) setSelectedAddressId(defaultAddr.id)
      }).catch(() => {})
    })
    settingsService.getSettings().then(r => {
      const s = r.data
      const map: Record<string, string> = {}
      if (Array.isArray(s)) s.forEach((item: any) => { map[item.key] = item.value })
      else if (typeof s === 'object') Object.assign(map, s)
      setTaxRate(parseFloat(map.tax_rate) || 0.18)
      setShippingConfig({
        free: parseInt(map.free_shipping_threshold) || 999,
        standard: parseInt(map.standard_shipping_price) || 99,
      })
    }).catch(() => {})
  }, [items, user, navigate])

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      const res = await couponService.validateCoupon(couponCode, subtotal)
      if (res.success) {
        setAppliedCoupon(res.data)
        setCouponDiscount(res.data.discount)
        toast.success(`Coupon applied! Discount: ${formatPrice(res.data.discount)}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid coupon')
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address')
      return
    }
    setLoading(true)
    try {
      const orderData = {
        items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, price: item.discountPrice || item.price })),
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
        notes: notes || undefined,
      }
      const res = await orderService.createOrder(orderData)
      if (res.success) {
        clearCart()
        toast.success('Order placed successfully!')
        navigate('/account/orders/' + res.data.id)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Address Selection */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-5 w-5" /> Delivery Address
            </h2>
            {addresses.length === 0 ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">No saved addresses.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {addresses.map((addr: any) => (
                  <label
                    key={addr.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                      selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium">{addr.name} - {addr.phone}</p>
                      <p className="text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                      <p className="text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5" /> Payment Method
            </h2>
            <div className="mt-4 space-y-3">
              {[
                { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive' },
                { value: 'online', label: 'Online Payment', desc: 'UPI / Card / Net Banking' },
                { value: 'upi', label: 'UPI Payment', desc: 'GPay, PhonePe, Paytm' },
              ].map(opt => (
                <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                  paymentMethod === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="payment" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} />
                  <div className="text-sm">
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Order Notes */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Order Notes (optional)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="input mt-3"
              rows={3}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="card h-fit p-6">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
            {items.map(item => (
              <div key={item.variantId} className="flex gap-3 text-sm">
                <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-medium line-clamp-1">{item.name}</p>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                </div>
                <span className="font-medium">{formatPrice((item.discountPrice || item.price) * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="input !py-2.5 !pl-10"
              />
            </div>
            <button onClick={handleApplyCoupon} className="btn-secondary !px-4 !py-2.5 text-sm">
              Apply
            </button>
          </div>

          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(shipping)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax ({Math.round(taxRate * 100)}%)</span><span>{formatPrice(tax)}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon Discount</span><span>-{formatPrice(couponDiscount)}</span></div>}
            <div className="border-t pt-2"><div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(total)}</span></div></div>
          </div>

          <button onClick={handlePlaceOrder} disabled={loading || addresses.length === 0} className="btn-primary mt-4 w-full">
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
