import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { serviceabilityService } from '../../services/serviceability.service'
import { SERVICE_LABELS, SERVICE_REQUEST_STATUS_LABELS, SERVICE_REQUEST_STATUS_COLORS } from '../../constants'

const STATUS_OPTIONS = ['WAITING', 'NOTIFIED', 'CLOSED']

export default function AdminServiceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const load = () => {
    const params: any = { page, limit: '20' }
    if (statusFilter) params.status = statusFilter
    serviceabilityService.getRequests(params).then(r => {
      setRequests(r.data.data || [])
      setTotal(r.data.pagination?.total || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { setLoading(true); load() }, [page, statusFilter])

  const handleStatus = async (requestId: string, status: string, notes: string) => {
    try {
      await serviceabilityService.updateRequest(requestId, { status, adminNotes: notes })
      toast.success(`Request marked as ${SERVICE_REQUEST_STATUS_LABELS[status]}`)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed')
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Link to="/admin" className="hover:text-gray-900">Dashboard</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">Service Requests</span></nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Service Availability Requests</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input !w-44 !py-2 text-sm">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{SERVICE_REQUEST_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {requests.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No service availability requests yet.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map(req => (
            <div key={String(req.id || req._id)} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${SERVICE_REQUEST_STATUS_COLORS[req.status]}`}>{SERVICE_REQUEST_STATUS_LABELS[req.status]}</span>
                    <span className="badge badge-info">{SERVICE_LABELS[req.requestedService] || req.requestedService}</span>
                  </div>
                  <p className="mt-2 font-medium">{req.name} <span className="text-gray-500">· {req.phone}</span>{req.alternatePhone && <span className="text-gray-400"> · alt {req.alternatePhone}</span>}</p>
                  <p className="text-sm text-gray-500">{req.city}, {req.state} - {req.pincode}</p>
                  {req.user && <p className="text-xs text-gray-400">Account: {req.user.name || req.user.phone}</p>}
                  {req.adminNotes && <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600">Notes: {req.adminNotes}</p>}
                </div>
                <div className="flex flex-col gap-1.5 text-xs">
                  {STATUS_OPTIONS.filter(s => s !== req.status).map(s => (
                    <button key={s} onClick={() => handleStatus(req.id || req._id, s, `${SERVICE_REQUEST_STATUS_LABELS[s]} by admin`)} className="font-medium text-brand-600 hover:text-brand-700">Mark {SERVICE_REQUEST_STATUS_LABELS[s]}</button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">{new Date(req.createdAt).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="mt-6 flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary !text-sm">Prev</button>
          <span className="self-center text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)} className="btn-secondary !text-sm">Next</button>
        </div>
      )}
    </div>
  )
}