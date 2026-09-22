import { useCallback, useEffect, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatDate } from '../../utils'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [status, setStatus] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/reviews', { params: { status, search, limit: '50' } }).then(response => setReviews(response.data.data || [])).catch(() => toast.error('Could not load reviews')).finally(() => setLoading(false))
  }, [search, status])

  useEffect(() => { load() }, [load])

  const moderate = async (id: string, nextStatus: string) => {
    try {
      await api.patch(`/reviews/${id}/status`, { status: nextStatus })
      setReviews(current => current.filter(review => review.id !== id && review._id !== id))
      toast.success(`Review ${nextStatus.toLowerCase()}`)
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update review') }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Trust & safety</p><h1 className="mt-2 text-2xl font-bold text-gray-900">Customer Reviews</h1></div><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="review-search">Search reviews</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input id="review-search" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} className="input pl-9" placeholder="Search text" /></div><button type="button" onClick={load} className="btn-secondary">Search</button></div></div>
      <div className="mt-6 flex gap-2 border-b border-gray-200"><select value={status} onChange={e => setStatus(e.target.value)} className="input !w-auto !py-2"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div>
      {loading ? <div className="mt-6 h-48 animate-pulse rounded-2xl bg-gray-100" /> : reviews.length === 0 ? <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-12 text-center text-sm text-gray-500">No reviews in this queue.</div> : <div className="mt-6 space-y-4">{reviews.map(review => { const id = review.id || review._id; return <article key={id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{review.productId?.name || 'Product review'}</h2><p className="mt-1 text-xs text-gray-500">By {review.userId?.name || 'Customer'} · {formatDate(review.createdAt)} · Order {review.orderId?.orderNumber || 'verified purchase'}</p></div><span className="badge badge-warning">{review.status}</span></div><p className="mt-4 font-medium text-navy-900">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} {review.title || ''}</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{review.comment}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => moderate(id, 'APPROVED')} className="btn-primary !px-3 !py-2 text-sm"><Check className="mr-1 h-4 w-4" /> Approve</button><button type="button" onClick={() => moderate(id, 'REJECTED')} className="btn-secondary !px-3 !py-2 text-sm"><X className="mr-1 h-4 w-4" /> Reject</button></div></article> })}</div>}
    </div>
  )
}
