import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/orders/${id}`).then(r => { setOrder(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    await api.put(`/orders/${id}`, { status })
    setOrder({ ...order, status })
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!order) return <div className="text-center py-12">Order not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/orders" className="hover:text-gray-900">Orders</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{order.orderNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{order.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Items</h2>
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between border-b py-3 text-sm last:border-0">
                <div><p className="font-medium">{item.variant?.name || item.variantId}</p><p className="text-gray-500">Qty: {item.quantity}</p></div>
                <p className="font-medium">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
          {order.address && (
            <div className="card p-6">
              <h2 className="font-semibold mb-2">Shipping Address</h2>
              <p className="text-sm text-gray-600">{order.address.name}, {order.address.phone}</p>
              <p className="text-sm text-gray-600">{order.address.addressLine1}, {order.address.city}, {order.address.state} - {order.address.pincode}</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.total - order.shipping - order.tax + order.discount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(order.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div>
              {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon</span><span>-{formatPrice(order.couponDiscount)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Update Status</h2>
            <div className="flex flex-wrap gap-2">
              {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => handleStatusUpdate(s)} className={`btn-ghost !text-xs ${order.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
