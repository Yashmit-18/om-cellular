import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/orders/${id}`).then(r => { setOrder(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/account/orders" className="hover:text-gray-900">Orders</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">{order.orderNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{order.status}</span>
      </div>
      <div className="mt-6 card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(order.createdAt)}</p></div>
          <div><p className="text-gray-500">Payment</p><p className="font-medium capitalize">{order.paymentMethod || 'N/A'}</p></div>
          <div><p className="text-gray-500">Payment Status</p><p className="font-medium">{order.paymentStatus}</p></div>
          {order.trackingNumber && <div><p className="text-gray-500">Tracking</p><p className="font-medium">{order.trackingNumber}</p></div>}
        </div>
        {order.items && order.items.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium">{item.variant?.name || item.variantId}</p><p className="text-gray-500">Qty: {item.quantity}</p></div>
                  <p className="font-medium">{formatPrice(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between font-bold">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
