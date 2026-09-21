import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, PackageSearch, Search, ShoppingBag } from 'lucide-react'
import { orderService } from '../../services/order.service'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants'
import ProductImage from '../../components/shop/ProductImage'

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleTrack = async (override?: string) => {
    const number = (override ?? orderNumber).trim()
    if (!number) return
    setLoading(true)
    setErrorMsg(null)
    setSubmitted(true)
    try {
      const res = await orderService.trackOrder(number)
      setResult(res.data || res)
    } catch (err: any) {
      setResult(null)
      const status = err?.response?.status
      setErrorMsg(status === 404
        ? 'We couldn’t find an order with that number. Double-check it (format like ORD-00001) and try again.'
        : 'Something went wrong while tracking your order. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  // Support "track your order" deep links like /track-order?order=ORD-00001
  useEffect(() => {
    const order = searchParams.get('order')
    if (order) {
      setOrderNumber(order)
      handleTrack(order)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
            <PackageSearch className="h-3.5 w-3.5" /> Stay updated
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Track Your Order</h1>
          <p className="mt-2 text-gray-500">Enter your order number to see live status updates</p>
        </div>

        <div className="card mt-8 p-6">
          <form onSubmit={e => { e.preventDefault(); handleTrack() }} className="flex gap-3">
            <input
              value={orderNumber}
              onChange={e => { setOrderNumber(e.target.value); setResult(null); setErrorMsg(null) }}
              placeholder="Order number (e.g. ORD-00001)"
              className="input flex-1"
              aria-label="Order number"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              <Search className="mr-1.5 h-4 w-4" />{loading ? 'Tracking...' : 'Track'}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
              <p className="mt-2 text-sm font-medium text-gray-900">Order not found</p>
              <p className="mt-0.5 text-xs text-gray-500">{errorMsg}</p>
              <button onClick={() => handleTrack()} className="btn-secondary mt-3 !py-2 text-sm">Try again</button>
            </div>
          )}

          {result && (
            <div className="animate-fade-in mt-6 space-y-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Order #</p>
                  <p className="font-bold">{result.orderNumber}</p>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[result.status] || 'badge-info'}`}>{ORDER_STATUS_LABELS[result.status] || result.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-4">
                <div><p className="text-gray-500">Date</p><p className="mt-0.5 font-medium">{formatDate(result.createdAt)}</p></div>
                <div><p className="text-gray-500">Total</p><p className="mt-0.5 font-medium">{formatPrice(result.total)}</p></div>
                {result.trackingNumber && <div><p className="text-gray-500">Tracking</p><p className="mt-0.5 font-medium">{result.trackingNumber}</p></div>}
                <div><p className="text-gray-500">Payment</p><p className="mt-0.5 font-medium capitalize">{result.paymentMethod || 'N/A'}</p></div>
              </div>

              {Array.isArray(result.items) && result.items.length > 0 && (
                <div>
                  <h3 className="mt-4 flex items-center gap-1.5 text-sm font-semibold"><ShoppingBag className="h-4 w-4 text-navy-700" /> Items</h3>
                  <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {result.items.map((item: any) => (
                      <div key={item.variantId || item.id} className="flex items-center gap-3 p-3">
                        <ProductImage src={item.image || ''} alt={item.name} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100" imgClassName="h-full w-full object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatPrice(item.price)} × {item.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {(result.subtotal >= 0 || result.shipping >= 0 || result.tax >= 0) && (
                      <div className="space-y-1.5 bg-gray-50/60 p-4 text-sm">
                        {result.subtotal >= 0 && <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatPrice(result.subtotal)}</span></div>}
                        {result.shipping != null && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span className="font-medium">{result.shipping === 0 ? <span className="text-emerald-600">Free</span> : formatPrice(result.shipping)}</span></div>}
                        {result.tax > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="font-medium">{formatPrice(result.tax)}</span></div>}
                        {result.couponCode && <div className="flex justify-between text-emerald-600"><span>Coupon ({result.couponCode})</span><span>-{formatPrice(result.discount || 0)}</span></div>}
                        <div className="flex justify-between border-t pt-1.5 font-bold"><span>Total</span><span>{formatPrice(result.total)}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && submitted && !errorMsg && !result && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No order loaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}