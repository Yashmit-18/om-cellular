import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, CreditCard, Truck, Tag, Building2, QrCode, ExternalLink, ShieldCheck, Banknote, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import { orderService } from '../../services/order.service'
import { couponService } from '../../services/coupon.service'
import { settingsService } from '../../services/settings.service'
import { paymentService, loadRazorpayScript, type OnlinePaymentMethod } from '../../services/payment.service'
import { formatPrice, googleMapsSearchUrl, storeAddressText } from '../../utils'

type PaymentMethod = 'cod' | 'upi' | 'netbanking' | 'online'

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [addresses, setAddresses] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  const [taxRate, setTaxRate] = useState(0.18)
  const [shippingConfig, setShippingConfig] = useState({ free: 999, standard: 99 })
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false)
  const [checkingPaymentConfig, setCheckingPaymentConfig] = useState(true)
  const [paymentState, setPaymentState] = useState<'idle' | 'creating' | 'initializing' | 'processing'>('idle')
  const [addressForm, setAddressForm] = useState({
    name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
  })

  const subtotal = getTotal()
  const shipping = subtotal >= shippingConfig.free ? 0 : shippingConfig.standard
  const tax = Math.round(subtotal * taxRate * 100) / 100
  const total = subtotal + shipping + tax - couponDiscount

  useEffect(() => {
    paymentService.getConfig()
      .then(r => setOnlinePaymentEnabled(Boolean(r.data?.enabled)))
      .catch(() => setOnlinePaymentEnabled(false))
      .finally(() => setCheckingPaymentConfig(false))
  }, [])

  useEffect(() => {
    if (items.length === 0 && !placedOrderId) {
      navigate('/cart')
    }
  }, [items, navigate, placedOrderId])

  useEffect(() => {
    if (!user) return
    import('../../services/api').then(api => {
      api.default.get('/auth/me').then(r => {
        const addrs = r.data.data?.addresses || []
        setAddresses(addrs)
        const defaultAddr = addrs.find((a: any) => a.isDefault)
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
          setAddressForm(f => ({
            ...f,
            name: defaultAddr.name, phone: defaultAddr.phone,
            addressLine1: defaultAddr.addressLine1, addressLine2: defaultAddr.addressLine2 || '',
            city: defaultAddr.city, state: defaultAddr.state, pincode: defaultAddr.pincode,
          }))
        }
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
  }, [user])

  const selectSavedAddress = (addr: any) => {
    setSelectedAddressId(addr.id)
    setAddressForm({
      name: addr.name, phone: addr.phone,
      addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 || '',
      city: addr.city, state: addr.state, pincode: addr.pincode,
    })
  }

  const validateAddress = (): string | null => {
    const f = addressForm
    if (!f.name.trim()) return 'Recipient name is required'
    if (!f.phone.trim() || f.phone.replace(/[^0-9]/g, '').length < 10) return 'Please enter a valid 10-digit phone number'
    if (!f.addressLine1.trim()) return 'Address line 1 is required'
    if (!f.city.trim()) return 'City is required'
    if (!f.state.trim()) return 'State is required'
    if (!/^\d{6}$/.test(f.pincode.trim())) return 'Please enter a valid 6-digit PIN code'
    return null
  }

  const openGatewayCheckout = async (orderId: string, method: OnlinePaymentMethod, amount: number) => {
    setPaymentState('initializing')
    try {
      const init = await paymentService.init(orderId, method)
      const data = init.data
      if (!init.success || !data?.razorpayOrderId) {
        toast.error(init.message || 'Unable to start online payment. Please try again or use Cash on Delivery.')
        return
      }

      const RazorpayCtor: any = await loadRazorpayScript()

      const razorpayOptions: any = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'OM Cellular',
        description: `Order payment (${method.toUpperCase()})`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: addressForm.name,
          contact: addressForm.phone,
          email: user?.email || undefined,
        },
        method: method === 'netbanking' ? { netbanking: true } : method === 'upi' ? { upi: true } : undefined,
        theme: { color: '#4f46e5' },
        handler: async (response: any) => {
          try {
            setPaymentState('processing')
            const verify = await paymentService.verify({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            if (verify.success) {
              clearCart()
              setPlacedOrderId(orderId)
              toast.success('Payment successful! Your order is confirmed.')
              navigate('/account/orders/' + orderId)
            } else {
              toast.error(verify.message || 'Payment could not be verified. Please contact support.')
              navigate('/account/orders/' + orderId, { state: { paymentPending: true } })
            }
          } catch {
            toast.error('Payment could not be verified. Please contact support.')
            navigate('/account/orders/' + orderId, { state: { paymentPending: true } })
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment window closed. Your order will remain pending until payment is confirmed.', { icon: 'ℹ️' })
            navigate('/account/orders/' + orderId, { state: { paymentPending: true } })
          },
        },
      }

      const rzp = new RazorpayCtor(razorpayOptions)
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again or use Cash on Delivery.')
        navigate('/account/orders/' + orderId, { state: { paymentPending: true } })
      })
      rzp.open()
    } catch (err: any) {
      setPaymentState('idle')
      toast.error(err?.response?.data?.message || err?.message || 'Unable to start online payment. Please try again or use Cash on Delivery.')
    }
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to place your order')
      return
    }
    if (!checkingPaymentConfig && paymentMethod !== 'cod' && !onlinePaymentEnabled) {
      toast.error('Online payment is not configured yet. Please use Cash on Delivery.')
      return
    }

    const addressError = validateAddress()
    if (addressError) {
      toast.error(addressError)
      return
    }

    setLoading(true)
    setPaymentState('creating')
    try {
      const orderData: any = {
        items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity, price: item.discountPrice || item.price })),
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
        notes: notes || undefined,
      }
      if (selectedAddressId) {
        orderData.addressId = selectedAddressId
      } else {
        orderData.address = {
          name: addressForm.name, phone: addressForm.phone,
          addressLine1: addressForm.addressLine1, addressLine2: addressForm.addressLine2 || undefined,
          city: addressForm.city, state: addressForm.state, pincode: addressForm.pincode,
        }
      }

      const res = await orderService.createOrder(orderData)
      if (res.success) {
        const orderId = res.data.id || res.data._id

        if (paymentMethod === 'cod') {
          clearCart()
          setPlacedOrderId(orderId)
          toast.success('Order placed successfully!')
          navigate('/account/orders/' + orderId)
          return
        }

        // Online method: open the secure gateway checkout. The order is only
        // marked PAID after server-side signature verification, not here.
        const gateMethod: OnlinePaymentMethod = paymentMethod === 'netbanking' ? 'netbanking' : paymentMethod === 'online' ? 'card' : 'upi'
        await openGatewayCheckout(orderId, gateMethod, total)
        // Do not clear the cart here — it is cleared only after payment success.
      }
    } catch (err: any) {
      setPaymentState('idle')
      toast.error(err.response?.data?.message || 'Failed to place order')
    } finally {
      setLoading(false)
      if (paymentState !== 'processing') setPaymentState('idle')
    }
  }

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

  if (items.length === 0 && !placedOrderId) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:pb-8 lg:px-8">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {!user ? (
        <div className="mt-6 card p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-500" />
          <h2 className="mt-3 text-lg font-bold text-gray-900">Login to continue checkout</h2>
          <p className="mt-1 text-sm text-gray-500">You need to be logged in to place an order. Your cart is saved.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link to="/login?redirect=/checkout" className="btn-primary">Login</Link>
            <Link to="/register?redirect=/checkout" className="btn-secondary">Create Account</Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* Address Section */}
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-5 w-5" /> Delivery Address
              </h2>

              {addresses.length > 0 && (
                <>
                  <div className="mt-4 space-y-3">
                    {addresses.map((addr: any) => (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                          selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => selectSavedAddress(addr)} className="mt-1" />
                        <div className="text-sm">
                          <p className="font-medium">{addr.name} - {addr.phone}</p>
                          <p className="text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                          <p className="text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAddressId('')}
                      className={`text-sm font-medium ${selectedAddressId === '' ? 'text-brand-700 underline' : 'text-brand-600 hover:text-brand-700'}`}
                    >
                      + Add a new address
                    </button>
                  </div>
                </>
              )}

              <div className={`mt-4 ${selectedAddressId ? 'hidden' : ''}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} className="input mt-1" placeholder="Recipient name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                    <input value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} inputMode="tel" className="input mt-1" placeholder="10-digit mobile number" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
                    <input value={addressForm.addressLine1} onChange={e => setAddressForm({ ...addressForm, addressLine1: e.target.value })} className="input mt-1" placeholder="House number, street, area" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
                    <input value={addressForm.addressLine2} onChange={e => setAddressForm({ ...addressForm, addressLine2: e.target.value })} className="input mt-1" placeholder="Landmark, building (optional)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <input value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="input mt-1" placeholder="City" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State *</label>
                    <input value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} className="input mt-1" placeholder="State" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN Code *</label>
                    <input value={addressForm.pincode} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} inputMode="numeric" className="input mt-1" placeholder="6-digit PIN code" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" /> Payment Method
              </h2>
              <div className="mt-4 space-y-3">
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                  paymentMethod === 'cod' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <Banknote className="h-5 w-5 text-gray-500" />
                  <div className="text-sm">
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-gray-500">Pay when you receive the order</p>
                  </div>
                </label>

                {onlinePaymentEnabled && (
                  <>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                      paymentMethod === 'upi' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} />
                      <QrCode className="h-5 w-5 text-gray-500" />
                      <div className="text-sm">
                        <p className="font-medium">UPI</p>
                        <p className="text-gray-500">GPay, PhonePe, Paytm, BHIM and more</p>
                      </div>
                    </label>

                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                      paymentMethod === 'netbanking' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="payment" checked={paymentMethod === 'netbanking'} onChange={() => setPaymentMethod('netbanking')} />
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div className="text-sm">
                        <p className="font-medium">Net Banking</p>
                        <p className="text-gray-500">Pay directly from your bank account</p>
                      </div>
                    </label>
                  </>
                )}
              </div>

              {onlinePaymentEnabled && paymentMethod !== 'cod' && (
                <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Wallet className="h-4 w-4 text-brand-600" /> Secure {paymentMethod.toUpperCase()} Payment
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    You will be redirected to a secure payment page to pay <span className="font-semibold text-gray-900">{formatPrice(total)}</span>.
                    {paymentMethod === 'upi' && ' A "Scan QR with any UPI app" option is available in the payment window.'}
                    Your order is confirmed only after the payment is verified by the bank / payment gateway.
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> 256-bit encrypted, PCI-DSS compliant gateway
                  </p>
                </div>
              )}

              {checkingPaymentConfig && paymentMethod !== 'cod' && (
                <p className="mt-3 text-xs text-gray-400">Checking payment options…</p>
              )}
              {!checkingPaymentConfig && !onlinePaymentEnabled && paymentMethod !== 'cod' && (
                <p className="mt-3 text-xs text-amber-600">Online payment is temporarily unavailable. Please use Cash on Delivery.</p>
              )}
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

            {/* Store info */}
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5" /> Visit Our Store
              </h2>
              <p className="mt-2 text-sm text-gray-600">{storeAddressText()}</p>
              <a href={googleMapsSearchUrl()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                Get directions on Google Maps <ExternalLink className="h-3.5 w-3.5" />
              </a>
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

            <button onClick={handlePlaceOrder} disabled={loading || !onlinePaymentEnabled && paymentMethod !== 'cod'} className="btn-primary mt-4 w-full">
              {paymentState === 'creating' ? 'Creating your order...' : paymentState === 'initializing' ? 'Initializing payment...' : paymentState === 'processing' ? 'Verifying payment...' : loading ? 'Please wait...' : paymentMethod !== 'cod' ? `Pay ${formatPrice(total)} & Place Order` : 'Place Order'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              {paymentState === 'initializing' ? 'Opening secure payment...' : paymentState === 'processing' ? 'Payment processing — please wait, do not close this window.' : paymentMethod !== 'cod' ? 'You will be redirected to a secure payment page. Order is confirmed only after payment verification.' : 'You will pay on delivery.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}