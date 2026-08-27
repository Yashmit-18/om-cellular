import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { formatDate } from '../../utils'
import { REQUEST_STATUS_COLORS } from '../../constants'

export default function AdminExchangeRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/exchange-requests').then(r => { setRequests(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Exchange Requests</h1>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Request #</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Old Device</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Date</th>
          </tr></thead>
          <tbody>{requests.map(r => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3"><Link to={`/admin/exchange-requests/${r.id}`} className="font-medium text-brand-600">{r.requestNumber}</Link></td>
              <td className="px-4 py-3">{r.user?.name || 'Guest'}</td>
              <td className="px-4 py-3">{r.oldBrand} {r.oldModel}</td>
              <td className="px-4 py-3"><span className={`badge ${REQUEST_STATUS_COLORS[r.status] || 'badge-info'}`}>{r.status}</span></td>
              <td className="px-4 py-3">{formatDate(r.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
