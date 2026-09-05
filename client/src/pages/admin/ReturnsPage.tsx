import { useEffect, useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { returnService } from '../../services/returnRequest.service'
import { formatPrice } from '../../utils'

const RETURN_STATUS_LABELS: Record<string, string> = {
  RETURN_REQUESTED: 'Requested',
  ADMIN_REVIEW: 'Under Review',
  RETURN_APPROVED: 'Approved',
  RETURN_REJECTED: 'Rejected',
  RETURN_RECEIVED: 'Items Received',
  REFUND_PENDING: 'Refund Pending',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
}

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

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params: any = { page, limit: '20' }
    if (statusFilter) params.status = statusFilter
    returnService.getReturns(params).then(r => {
      setRequests(r.data || [])
      setTotal(r.pagination?.total || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStatus = useCallback(async (requestId: string, status: string) => {
    try {
      const res = await returnService.updateReturn(requestId, { status, adminNote: `Marked ${RETURN_STATUS_LABELS[status]} by admin` })
      toast.success(res.data?.message || `Return marked ${RETURN_STATUS_LABELS[status]}`)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed')
    }
  }, [load])

  const handleTracking = useCallback(async (requestId: string, tracking: string) => {
    try {
      await returnService.updateReturn(requestId, { trackingNumber: tracking })
      toast.success('Tracking number saved')
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed')
    }
  }, [load])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  const statusOptions = ['RETURN_REQUESTED', 'ADMIN_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED']

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4"><Link to="/admin" className="hover:text-gray-900">Dashboard</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">Returns</span></nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Returns Management</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input !w-48 !py-2 text-sm">
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{RETURN_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {requests.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No return requests yet.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map(r => (
            <ReturnCard
              key={String(r._id)}
              r={r}
              onStatus={handleStatus}
              onTracking={handleTracking}
            />
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

function ReturnCard({ r, onStatus, onTracking }: { r: any; onStatus: (id: string, status: string) => void; onTracking: (id: string, tracking: string) => void }) {
  const [tracking, setTracking] = useState(r.trackingNumber || '')

  const nextActions: Record<string, string[]> = {
    RETURN_REQUESTED: ['ADMIN_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED'],
    ADMIN_REVIEW: ['RETURN_APPROVED', 'RETURN_REJECTED'],
    RETURN_APPROVED: ['RETURN_RECEIVED', 'CANCELLED'],
    RETURN_RECEIVED: ['REFUND_PENDING'],
    REFUND_PENDING: ['REFUNDED'],
  }

  const order = r.orderId
  const actions = nextActions[r.status] || []

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`badge ${RETURN_STATUS_COLORS[r.status]}`}>{RETURN_STATUS_LABELS[r.status]}</span>
            <span className="font-semibold">{r.returnNumber}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Order {order?.orderNumber || r.orderId} · <span className="font-medium">{formatPrice(r.refundAmount)}</span> · {r.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0} item(s)
          </p>
          <p className="text-sm text-gray-500">{r.reason}{r.description ? ` — ${r.description}` : ''}</p>
          <p className="mt-1 text-xs text-gray-400">
            Requested {new Date(r.createdAt).toLocaleString('en-IN')} ·
            {order?.paymentStatus ? ` Payment: ${order.paymentStatus}` : ''}
            {order?.paymentGateway ? ` (${order.paymentGateway})` : ''}
          </p>
          {r.statusHistory && r.statusHistory.length > 0 && (
            <div className="mt-2 space-y-1 text-xs text-gray-400">
              {r.statusHistory.slice(-3).map((h: any, i: number) => (
                <p key={i}>• {h.status.replace(/_/g, ' ').toLowerCase()} — {new Date(h.changedAt).toLocaleString('en-IN')}{h.changedBy ? ` (${h.changedBy})` : ''}</p>
              ))}
            </div>
          )}
          {r.adminNote && <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600">Admin note: {r.adminNote}</p>}
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          {actions.map(s => (
            <button key={s} onClick={() => onStatus(r._id, s)} className="font-medium text-brand-600 hover:text-brand-700">Mark {RETURN_STATUS_LABELS[s]}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Return tracking number" className="input !py-1.5 text-xs flex-1" />
        <button onClick={() => onTracking(r._id, tracking.trim())} className="btn-secondary !px-3 !py-1.5 !text-xs">Save Tracking</button>
      </div>
    </div>
  )
}