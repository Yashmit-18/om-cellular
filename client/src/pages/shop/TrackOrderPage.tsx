import { useState } from 'react'
import { AlertCircle, PackageSearch, Search } from 'lucide-react'
import { orderService } from '../../services/order.service'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleTrack = async () => {
    if (!orderNumber.trim()) return
    setLoading(true)
    setError(false)
    setSubmitted(true)
    try {
      const res = await orderService.trackOrder(orderNumber)
      setResult(res.data || res)
    } catch {
      setResult(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-brand-50/30 via-white to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
            <PackageSearch className="h-3.5 w-3.5" /> Stay updated
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Track Your Order</h1>
          <p className="mt-2 text-gray-500">Enter your order number to see live status updates</p>
        </div>

        <div className="card mt-8 p-6">
          <form onSubmit={e => { e.preventDefault(); handleTrack() }} className="flex gap-3">
            <input
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="Order number (e.g. ORD-00001)"
              className="input flex-1"
              aria-label="Order number"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              <Search className="mr-1.5 h-4 w-4" />{loading ? 'Tracking...' : 'Track'}
            </button>
          </form>

          {error && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
              <p className="mt-2 text-sm font-medium text-gray-900">Order not found</p>
              <p className="mt-0.5 text-xs text-gray-500">Check your order number and try again. If you placed this order, contact us for help.</p>
            </div>
          )}

          {result && (
            <div className="animate-fade-in mt-6 space-y-4">
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
              {result.statusHistory && result.statusHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mt-4">Status History</h3>
                  <div className="mt-3 rounded-xl border border-gray-100 p-4">
                    <StatusTimeline history={result.statusHistory} labels={ORDER_STATUS_LABELS} colors={ORDER_STATUS_COLORS} />
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && submitted && !error && !result && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No order loaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}