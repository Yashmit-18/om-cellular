import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { returnService } from '../../services/returnRequest.service'
import { formatDate, formatPrice } from '../../utils'

const RETURN_STATUS_COLORS: Record<string, string> = {
  RETURN_REQUESTED: 'badge-warning',
  ADMIN_REVIEW: 'badge-info',
  RETURN_APPROVED: 'badge-info',
  RETURN_REJECTED: 'badge-danger',
  RETURN_RECEIVED: 'badge-info',
  REFUND_PENDING: 'badge-warning',
  REFUNDED: 'badge-success',
  CANCELLED: 'badge-default',
}

export default function AccountReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    returnService.getReturns().then(r => { setReturns(r.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">My Returns</h1>
      <p className="mt-1 text-sm text-gray-500">Track your return requests and refunds.</p>
      {returns.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No return requests yet.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {returns.map(r => (
            <div key={r._id} className="card block p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.returnNumber}</p>
                  <p className="text-sm text-gray-500">{formatDate(r.createdAt)} · Order {(r.orderId as any)?.orderNumber || '—'}</p>
                  <p className="mt-1 text-sm text-gray-600">{r.reason}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(r.refundAmount)}</p>
                  <span className={`badge ${RETURN_STATUS_COLORS[r.status] || 'badge-default'}`}>{r.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              {r.adminNote && <p className="mt-3 rounded bg-gray-50 p-2 text-xs text-gray-600">Admin note: {r.adminNote}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 text-sm text-gray-500">
        Need to start a return? Go to <Link to="/account/orders" className="text-brand-600 underline">your orders</Link> and open a delivered order.
      </div>
    </div>
  )
}