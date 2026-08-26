import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders').then(r => { setOrders(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-6 card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Order #</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Payment</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Date</th>
          </tr></thead>
          <tbody>{orders.map(o => (
            <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3"><Link to={`/admin/orders/${o.id}`} className="font-medium text-brand-600">{o.orderNumber}</Link></td>
              <td className="px-4 py-3">{o.user?.name || 'Guest'}</td>
              <td className="px-4 py-3">{formatPrice(o.total)}</td>
              <td className="px-4 py-3 capitalize">{o.paymentMethod || 'N/A'}</td>
              <td className="px-4 py-3"><span className={`badge ${ORDER_STATUS_COLORS[o.status] || 'badge-info'}`}>{o.status}</span></td>
              <td className="px-4 py-3">{formatDate(o.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
