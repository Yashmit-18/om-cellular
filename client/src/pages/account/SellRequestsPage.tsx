import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

export default function AccountSellRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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
              <button className="block w-full text-left" onClick={() => setExpanded(expanded === req.id ? null : req.id)}>
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold">{req.requestNumber}</p><p className="text-sm text-gray-500">{req.brand} {req.model} - {req.storage}</p></div>
                  <span className={`badge ${REQUEST_STATUS_COLORS[req.status] || 'badge-info'}`}>{REQUEST_STATUS_LABELS[req.status] || req.status}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{formatDate(req.createdAt)}</p>
                {req.estimatedPrice && <p className="text-sm font-medium text-emerald-600">{formatPrice(req.estimatedPrice)}</p>}
              </button>
              {expanded === req.id && (
                <div className="mt-4 border-t pt-4">
                  <StatusTimeline history={req.statusHistory} labels={REQUEST_STATUS_LABELS} colors={REQUEST_STATUS_COLORS} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}