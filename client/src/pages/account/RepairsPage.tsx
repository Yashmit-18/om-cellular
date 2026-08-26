import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate } from '../../utils'
import { REPAIR_STATUS_COLORS } from '../../constants'

export default function AccountRepairsPage() {
  const [repairs, setRepairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/repairs').then(r => { setRepairs(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">My Repairs</h1>
      {repairs.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-gray-500">No repair bookings yet.</div>
      ) : (
        <div className="mt-6 space-y-4">
          {repairs.map(repair => (
            <div key={repair.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div><p className="font-semibold">{repair.bookingNumber}</p><p className="text-sm text-gray-500">{repair.brand} {repair.model}</p></div>
                <span className={`badge ${REPAIR_STATUS_COLORS[repair.status] || 'badge-info'}`}>{repair.status}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{formatDate(repair.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
