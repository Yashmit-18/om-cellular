import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck, Star } from 'lucide-react'
import { reviewService } from '../../services/review.service'
import type { RatingSummary, Review } from '../../types'
import { formatDate } from '../../utils'

interface ProductReviewsProps {
  productId: string
}

const emptySummary: RatingSummary = { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }

function Stars({ rating }: { rating: number }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-gold-400 text-gold-500' : 'text-gray-200'}`} aria-hidden="true" />)}</span>
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<RatingSummary>(emptySummary)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    reviewService.getReviews({ productId, page: String(page), limit: '10', sort })
      .then(result => {
        if (!active) return
        setReviews(result.data || [])
        setSummary(result.summary || emptySummary)
        setTotalPages(result.pagination?.totalPages || 1)
      })
      .catch(() => { if (active) { setReviews([]); setSummary(emptySummary) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [productId, page, sort])

  const changeSort = (value: string) => { setSort(value); setPage(1) }
  const total = Math.max(summary.count, 1)

  return (
    <section aria-labelledby="customer-reviews-heading" className="border-t border-gray-100 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Customer trust</span>
          <h2 id="customer-reviews-heading" className="section-heading mt-3">Customer Reviews</h2>
          <p className="mt-2 text-sm text-gray-500">Verified feedback from customers who received this product.</p>
        </div>
        {summary.count > 0 && <label className="text-sm text-gray-600">Sort reviews <select value={sort} onChange={e => changeSort(e.target.value)} className="input ml-2 !w-auto !py-2"><option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>}
      </div>

      {summary.count === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-ivory-100/60 p-8 text-center">
          <Star className="mx-auto h-7 w-7 text-gray-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-gray-900">No reviews yet</p>
          <p className="mt-1 text-sm text-gray-500">Be the first verified customer to share your experience.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(180px,0.7fr)_minmax(280px,1fr)]">
          <div className="rounded-2xl border border-gray-100 bg-ivory-100/60 p-6 text-center">
            <p className="text-4xl font-bold text-navy-900">{summary.average?.toFixed(1)}</p>
            <div className="mt-2"><Stars rating={Math.round(summary.average || 0)} /></div>
            <p className="mt-2 text-sm text-gray-500">Based on {summary.count} review{summary.count === 1 ? '' : 's'}</p>
          </div>
          <div className="space-y-2 rounded-2xl border border-gray-100 p-5">
            {[5, 4, 3, 2, 1].map(rating => <div key={rating} className="flex items-center gap-3 text-sm"><span className="w-10 text-gray-600">{rating} star</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold-400" style={{ width: `${(summary.distribution[rating as 1 | 2 | 3 | 4 | 5] / total) * 100}%` }} /></div><span className="w-6 text-right text-gray-500">{summary.distribution[rating as 1 | 2 | 3 | 4 | 5]}</span></div>)}
          </div>
        </div>
      )}

      {loading ? <div className="mt-8 h-32 animate-pulse rounded-2xl bg-gray-100" /> : reviews.length > 0 && <div className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-100">
        {reviews.map(review => <article key={review.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><Stars rating={review.rating} />{review.isVerifiedPurchase && <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified Purchase</span>}</div><time className="text-xs text-gray-500">{formatDate(review.createdAt)}</time></div>
          {review.title && <h3 className="mt-3 font-semibold text-gray-900">{review.title}</h3>}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{review.comment}</p>
        </article>)}
      </div>}

      {totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Previous reviews"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm text-gray-600" aria-live="polite">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 disabled:opacity-40" aria-label="Next reviews"><ChevronRight className="h-4 w-4" /></button></div>}
    </section>
  )
}
