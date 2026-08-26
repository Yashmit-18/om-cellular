import { useState } from 'react'
import { Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { orderService } from '../../services/order.service'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTrack = async () => {
    if (!orderNumber.trim()) { toast.error('Enter order number'); return }
    setLoading(true)
    try {
      const res = await orderService.trackOrder(orderNumber)
      setResult(res.data || res)
    } catch {
      toast.error('Order not found')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Package className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-3xl font-bold">Track Order</h1>
        <p className="mt-2 text-gray-500">Enter your order number to track status</p>
      </div>
      <div className="mt-8 card p-6">
        <div className="flex gap-3">
          <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Order number (e.g. ORD-00001)" className="input flex-1" />
          <button onClick={handleTrack} disabled={loading} className="btn-primary">{loading ? 'Tracking...' : 'Track'}</button>
        </div>
        {result && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Order #</p><p className="font-bold">{result.orderNumber}</p></div>
              <span className={`badge ${ORDER_STATUS_COLORS[result.status] || 'badge-info'}`}>{result.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(result.createdAt)}</p></div>
              <div><p className="text-gray-500">Total</p><p className="font-medium">{formatPrice(result.total)}</p></div>
              {result.trackingNumber && <div><p className="text-gray-500">Tracking</p><p className="font-medium">{result.trackingNumber}</p></div>}
              <div><p className="text-gray-500">Payment</p><p className="font-medium capitalize">{result.paymentMethod || 'N/A'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
