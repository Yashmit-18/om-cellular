import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders').then(r => { setOrders(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No orders yet.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/account/orders/${order.id}`} className="card block p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p></div>
                <div className="text-right"><p className="font-bold">{formatPrice(order.total)}</p><span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{order.status}</span></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
