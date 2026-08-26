import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate } from '../../utils'
import { REQUEST_STATUS_COLORS } from '../../constants'

export default function AccountSellRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sell-requests').then(r => { setRequests(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">My Sell Requests</h1>
      {requests.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No sell requests yet.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {requests.map(req => (
            <div key={req.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{req.requestNumber}</p><p className="text-sm text-gray-500">{req.brand} {req.model} - {req.storage}</p></div>
                <span className={`badge ${REQUEST_STATUS_COLORS[req.status] || 'badge-info'}`}>{req.status}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{formatDate(req.createdAt)}</p>
              {req.estimatedPrice && <p className="text-sm font-medium">Estimated: Rs. {req.estimatedPrice}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
