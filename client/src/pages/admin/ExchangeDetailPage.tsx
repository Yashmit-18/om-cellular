import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

const STATUS_OPTIONS = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED', 'OFFER_MADE', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED']

export default function AdminExchangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/exchange-requests/${id}`).then(r => { setRequest(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!note.trim()) {
      toast.error('Please add a note describing the status change')
      return
    }
    const data: any = { status, note }
    if (estimatedValue && estimatedValue !== '' && (status === 'APPROVED' || status === 'INSPECTED')) data.estimatedExchangeValue = Number(estimatedValue)
    setUpdating(true)
    try {
      const res = await api.put(`/exchange-requests/${id}`, data)
      setRequest(res.data.data)
      setNote('')
      setEstimatedValue('')
      toast.success(`Status changed to ${REQUEST_STATUS_LABELS[status]}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update request')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!request) return <div className="text-center py-12">Request not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/exchange-requests" className="hover:text-gray-900">Exchange Requests</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{request.requestNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{request.requestNumber}</h1>
        <span className={`badge ${REQUEST_STATUS_COLORS[request.status] || 'badge-info'}`}>{REQUEST_STATUS_LABELS[request.status] || request.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold">Exchange Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Device</p><p className="font-medium">{request.oldBrand} {request.oldModel}</p></div>
              <div><p className="text-gray-500">Customer</p><p className="font-medium">{request.name || 'Guest'}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{request.phone || 'N/A'}</p></div>
              {request.alternatePhone && <div><p className="text-gray-500">Alt Phone</p><p className="font-medium">{request.alternatePhone}</p></div>}
              <div><p className="text-gray-500">Condition</p><p className="font-medium">{request.oldCondition}</p></div>
              {request.estimatedExchangeValue && <div><p className="text-gray-500">Est. Value</p><p className="font-medium">{formatPrice(request.estimatedExchangeValue)}</p></div>}
              <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(request.createdAt)}</p></div>
            </div>
            {request.adminNotes && <div><p className="text-gray-500 text-sm">Admin Notes</p><p className="mt-1 text-sm">{request.adminNotes}</p></div>}
            {request.pickupDetails && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Pickup Details</p>
                <p className="mt-1">{request.pickupDetails.name}, {request.pickupDetails.phone}</p>
                <p>{request.pickupDetails.addressLine1}{request.pickupDetails.landmark ? ` (${request.pickupDetails.landmark})` : ''}</p>
                <p>{request.pickupDetails.city}, {request.pickupDetails.state} - {request.pickupDetails.pincode}</p>
              </div>
            )}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Exchange Timeline</h2>
            <StatusTimeline history={request.statusHistory} labels={REQUEST_STATUS_LABELS} colors={REQUEST_STATUS_COLORS} />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-2">Update Status</h2>
          <p className="mb-3 text-xs text-gray-400">A note is required and saved to the timeline.</p>
          <input value={note} onChange={e => setNote(e.target.value)} className="input mb-3 !py-2 text-sm" placeholder="Status update note (required)" />
          <div className="mb-3"><label className="block text-xs font-medium text-gray-600">Estimated Exchange Value (₹, optional)</label><input value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} type="number" className="input mt-1 !py-2 text-sm" placeholder="e.g. 8000" /></div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => handleStatusUpdate(s)} disabled={updating} className={`btn-ghost !text-xs ${request.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{REQUEST_STATUS_LABELS[s] || s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}