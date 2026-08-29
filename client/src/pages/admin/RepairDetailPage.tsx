import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REPAIR_STATUS_COLORS } from '../../constants'

export default function AdminRepairDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [repair, setRepair] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/repairs/${id}`).then(r => { setRepair(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    await api.put(`/repairs/${id}`, { status })
    setRepair({ ...repair, status })
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!repair) return <div className="text-center py-12">Repair not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/repairs" className="hover:text-gray-900">Repairs</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{repair.bookingNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{repair.bookingNumber}</h1>
        <span className={`badge ${REPAIR_STATUS_COLORS[repair.status] || 'badge-info'}`}>{repair.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold">Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500">Device</p><p className="font-medium">{repair.brand} {repair.model}</p></div>
            <div><p className="text-gray-500">Customer</p><p className="font-medium">{repair.user?.name || 'N/A'}</p></div>
            <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(repair.createdAt)}</p></div>
            {repair.estimatedCost && <div><p className="text-gray-500">Est. Cost</p><p className="font-medium">{formatPrice(repair.estimatedCost)}</p></div>}
            {repair.technicianName && <div><p className="text-gray-500">Technician</p><p className="font-medium">{repair.technicianName}</p></div>}
            <div><p className="text-gray-500">Service Mode</p><p className="font-medium">{repair.serviceMode === 'DOORSTEP_PICKUP' ? 'Doorstep Pickup' : 'Store Drop-off'}</p></div>
            {repair.pickupFee > 0 && <div><p className="text-gray-500">Pickup Fee</p><p className="font-medium">{formatPrice(repair.pickupFee)}</p></div>}
            {repair.pickupAddress && <div><p className="text-gray-500">Pickup Address</p><p className="font-medium">{repair.pickupAddress}</p></div>}
          </div>
          <div><p className="text-gray-500 text-sm">Problem</p><p className="mt-1 text-sm">{repair.problemDescription}</p></div>
          {repair.technicianNotes && <div><p className="text-gray-500 text-sm">Technician Notes</p><p className="mt-1 text-sm">{repair.technicianNotes}</p></div>}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {['IN_DIAGNOSIS', 'DIAGNOSED', 'IN_REPAIR', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => handleStatusUpdate(s)} className={`btn-ghost !text-xs ${repair.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
