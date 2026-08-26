import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REQUEST_STATUS_COLORS } from '../../constants'

export default function AdminSellDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/sell-requests/${id}`).then(r => { setRequest(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string, finalPrice?: number) => {
    const data: any = { status }
    if (finalPrice !== undefined) data.finalOfferedPrice = finalPrice
    await api.put(`/sell-requests/${id}`, data)
    setRequest({ ...request, ...data })
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!request) return <div className="text-center py-12">Request not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/sell-requests" className="hover:text-gray-900">Sell Requests</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{request.requestNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{request.requestNumber}</h1>
        <span className={`badge ${REQUEST_STATUS_COLORS[request.status] || 'badge-info'}`}>{request.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold">Device Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500">Brand</p><p className="font-medium">{request.brand}</p></div>
            <div><p className="text-gray-500">Model</p><p className="font-medium">{request.model}</p></div>
            <div><p className="text-gray-500">Storage</p><p className="font-medium">{request.storage}</p></div>
            <div><p className="text-gray-500">Condition</p><p className="font-medium">{request.condition}</p></div>
            <div><p className="text-gray-500">Est. Price</p><p className="font-medium">{request.estimatedPrice ? formatPrice(request.estimatedPrice) : 'N/A'}</p></div>
            <div><p className="text-gray-500">Final Offer</p><p className="font-medium">{request.finalOfferedPrice ? formatPrice(request.finalOfferedPrice) : 'Pending'}</p></div>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].map(s => (
              <button key={s} onClick={() => handleStatusUpdate(s)} className={`btn-ghost !text-xs ${request.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
