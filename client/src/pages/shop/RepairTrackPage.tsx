import { useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { repairService } from '../../services/repair.service'
import { formatDate } from '../../utils'
import { REPAIR_STATUS_COLORS } from '../../constants'

export default function RepairTrackPage() {
  const [bookingNumber, setBookingNumber] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTrack = async () => {
    if (!bookingNumber.trim()) { toast.error('Enter booking number'); return }
    setLoading(true)
    try {
      const res = await repairService.trackRepair(bookingNumber)
      setResult(res.data || res.data?.data || res)
    } catch {
      toast.error('Repair not found')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Wrench className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-3xl font-bold">Track Repair</h1>
        <p className="mt-2 text-gray-500">Enter your booking number to track status</p>
      </div>
      <div className="mt-8 card p-6">
        <div className="flex gap-3">
          <input value={bookingNumber} onChange={e => setBookingNumber(e.target.value)} placeholder="Booking number" className="input flex-1" />
          <button onClick={handleTrack} disabled={loading} className="btn-primary">{loading ? 'Tracking...' : 'Track'}</button>
        </div>
        {result && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Booking #</p><p className="font-bold">{result.bookingNumber}</p></div>
              <span className={`badge ${REPAIR_STATUS_COLORS[result.status] || 'badge-info'}`}>{result.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Device</p><p className="font-medium">{result.brand} {result.model}</p></div>
              <div><p className="text-gray-500">Created</p><p className="font-medium">{formatDate(result.createdAt)}</p></div>
              {result.estimatedCost && <div><p className="text-gray-500">Estimated Cost</p><p className="font-medium">Rs. {result.estimatedCost}</p></div>}
              {result.technicianName && <div><p className="text-gray-500">Technician</p><p className="font-medium">{result.technicianName}</p></div>}
            </div>
            {result.statusHistory && result.statusHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mt-4">Status History</h3>
                <div className="mt-2 space-y-2">
                  {result.statusHistory.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <p className="font-medium">{h.status}</p>
                        {h.note && <p className="text-gray-500">{h.note}</p>}
                        <p className="text-xs text-gray-400">{formatDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
