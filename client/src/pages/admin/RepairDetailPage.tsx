import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

const STATUS_OPTIONS = ['APPROVED', 'IN_DIAGNOSIS', 'DIAGNOSED', 'REJECTED', 'IN_REPAIR', 'AWAITING_PARTS', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

export default function AdminRepairDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [repair, setRepair] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [technicianNotes, setTechnicianNotes] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [finalCost, setFinalCost] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/repairs/${id}`).then(r => {
      const data = r.data.data
      setRepair(data)
      setTechnicianNotes(data.technicianNotes || '')
      setAdminNotes(data.adminNotes || '')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!note.trim()) {
      toast.error('Please add a note describing the status change')
      return
    }
    setUpdating(true)
    try {
      const res = await api.put(`/repairs/${id}`, { status, note })
      setRepair(res.data.data)
      setNote('')
      toast.success(`Repair moved to ${REPAIR_STATUS_LABELS[status]}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update repair status')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveDetails = async () => {
    const data: any = {}
    if (technicianNotes !== repair.technicianNotes) data.technicianNotes = technicianNotes
    if (adminNotes !== repair.adminNotes) data.adminNotes = adminNotes
    if (estimatedCost !== '') data.estimatedCost = Number(estimatedCost)
    if (finalCost !== '') data.finalCost = Number(finalCost)
    if (Object.keys(data).length === 0) return
    setUpdating(true)
    try {
      const res = await api.put(`/repairs/${id}`, data)
      setRepair(res.data.data)
      setEstimatedCost('')
      setFinalCost('')
      toast.success('Repair details saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save details')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!repair) return <div className="text-center py-12">Repair not found</div>

  const details = repair.pickupDetails

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/repairs" className="hover:text-gray-900">Repairs</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{repair.bookingNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{repair.bookingNumber}</h1>
        <span className={`badge ${REPAIR_STATUS_COLORS[repair.status] || 'badge-info'}`}>{REPAIR_STATUS_LABELS[repair.status] || repair.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold">Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Device</p><p className="font-medium">{repair.brand} {repair.model}</p></div>
              <div><p className="text-gray-500">Customer</p><p className="font-medium">{repair.user?.name || 'Guest'}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{repair.phone || 'N/A'}</p></div>
              {repair.alternatePhone && <div><p className="text-gray-500">Alt Phone</p><p className="font-medium">{repair.alternatePhone}</p></div>}
              <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(repair.createdAt)}</p></div>
              {repair.estimatedCost != null && <div><p className="text-gray-500">Est. Cost</p><p className="font-medium">{formatPrice(repair.estimatedCost)}</p></div>}
              {repair.finalCost != null && <div><p className="text-gray-500">Final Cost</p><p className="font-medium">{formatPrice(repair.finalCost)}</p></div>}
              {repair.technicianName && <div><p className="text-gray-500">Technician</p><p className="font-medium">{repair.technicianName}</p></div>}
              <div><p className="text-gray-500">Service Mode</p><p className="font-medium">{repair.serviceMode === 'DOORSTEP_PICKUP' ? 'Doorstep Pickup' : 'Store Drop-off'}</p></div>
              {repair.pickupFee > 0 && <div><p className="text-gray-500">Pickup Fee</p><p className="font-medium">{formatPrice(repair.pickupFee)}</p></div>}
            </div>
            {details && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Pickup Address</p>
                <p className="mt-1">{details.name}, {details.phone}</p>
                <p>{details.addressLine1}{details.addressLine2 ? `, ${details.addressLine2}` : ''}{details.landmark ? ` (${details.landmark})` : ''}</p>
                <p>{details.city}, {details.state} - {details.pincode}</p>
              </div>
            )}
            {repair.pickupAddress && !details && <div><p className="text-gray-500 text-sm">Pickup Address</p><p className="text-sm">{repair.pickupAddress}</p></div>}
            <div><p className="text-gray-500 text-sm">Problem</p><p className="mt-1 text-sm">{repair.problemDescription}</p></div>
            {repair.technicianNotes && <div><p className="text-gray-500 text-sm">Technician Notes</p><p className="mt-1 text-sm">{repair.technicianNotes}</p></div>}
            {repair.adminNotes && <div><p className="text-gray-500 text-sm">Admin Notes</p><p className="mt-1 text-sm">{repair.adminNotes}</p></div>}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Repair Timeline</h2>
            <StatusTimeline history={repair.statusHistory} labels={REPAIR_STATUS_LABELS} colors={REPAIR_STATUS_COLORS} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-2">Update Status</h2>
            <p className="mb-3 text-xs text-gray-400">A note is required and saved to the timeline.</p>
            <input value={note} onChange={e => setNote(e.target.value)} className="input mb-3 !py-2 text-sm" placeholder="Status update note (required)" />
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => handleStatusUpdate(s)} disabled={updating} className={`btn-ghost !text-xs ${repair.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{REPAIR_STATUS_LABELS[s] || s}</button>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Cost & Notes</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Estimated Cost</label><input value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} type="number" className="input mt-1 !py-2 text-sm" placeholder={repair.estimatedCost?.toString() || '₹'}/></div>
              <div><label className="text-xs font-medium text-gray-600">Final Cost</label><input value={finalCost} onChange={e => setFinalCost(e.target.value)} type="number" className="input mt-1 !py-2 text-sm" placeholder={repair.finalCost?.toString() || '₹'}/></div>
            </div>
            <div className="mt-3"><label className="text-xs font-medium text-gray-600">Technician Notes</label><textarea value={technicianNotes} onChange={e => setTechnicianNotes(e.target.value)} rows={2} className="input mt-1 text-sm" /></div>
            <div className="mt-3"><label className="text-xs font-medium text-gray-600">Admin Notes</label><textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="input mt-1 text-sm" /></div>
            <button onClick={handleSaveDetails} disabled={updating} className="btn-primary mt-3 w-full !py-2 text-sm">Save Details</button>
          </div>
        </div>
      </div>
    </div>
  )
}