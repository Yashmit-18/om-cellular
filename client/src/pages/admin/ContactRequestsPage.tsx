import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate } from '../../utils'
import toast from 'react-hot-toast'

export default function AdminContactRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contact-requests').then(r => { setRequests(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleStatusUpdate = async (id: string, status: string) => {
    await api.put(`/contact-requests/${id}`, { status })
    setRequests(requests.map(r => r.id === id ? { ...r, status } : r))
    toast.success('Updated')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Contact Requests</h1>
      <div className="mt-6 space-y-4">
        {requests.map(r => (
          <div key={r.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.name} <span className="font-normal text-gray-500">({r.email})</span></p>
                {r.subject && <p className="text-sm text-gray-500">{r.subject}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${r.status === 'PENDING' ? 'badge-warning' : r.status === 'REPLIED' ? 'badge-success' : 'badge-info'}`}>{r.status}</span>
                {r.status === 'PENDING' && (
                  <button onClick={() => handleStatusUpdate(r.id, 'READ')} className="btn-ghost !text-xs">Mark Read</button>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-600">{r.message}</p>
            <p className="mt-2 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-gray-500 py-8">No contact requests.</p>}
      </div>
    </div>
  )
}
