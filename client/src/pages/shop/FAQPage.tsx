import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, AlertTriangle, HelpCircle } from 'lucide-react'
import api from '../../services/api'
import type { FAQ } from '../../types'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchFaqs = () => {
    setLoading(true)
    setError(false)
    api.get('/faqs')
      .then(r => setFaqs(r.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchFaqs() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return faqs
    return faqs.filter(f =>
      f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    )
  }, [faqs, search])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:px-6 lg:px-8">
        <div className="skeleton mx-auto h-9 w-72" />
        <div className="skeleton mx-auto h-4 w-56" />
        {[0, 1, 2, 3].map(n => <div key={n} className="skeleton h-16 w-full" />)}
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
            <HelpCircle className="h-3.5 w-3.5" /> Need clarity?
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Frequently Asked Questions</h1>
          <p className="mt-2 text-gray-500">Find answers to common questions about buying, selling, repairing and exchanging phones</p>
        </div>

        <div className="relative mx-auto mt-8 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search FAQs..."
            className="input !py-2.5 pl-10"
          />
        </div>

        {error ? (
          <div className="card mt-8 p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Couldn’t load FAQs</h3>
            <p className="mt-1.5 text-sm text-gray-500">Something went wrong while fetching the FAQ list. Please try again.</p>
            <button onClick={fetchFaqs} className="btn-primary mt-6">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card mt-8 p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><HelpCircle className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{search ? 'No matching FAQs' : 'No FAQs available yet'}</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              {search ? 'Try a different keyword, or contact us for direct assistance.' : 'Check back soon or contact us for direct assistance.'}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {filtered.map(faq => {
              const isOpen = openId === faq.id
              return (
                <div key={faq.id} className={`card overflow-hidden transition-all ${isOpen ? 'border-navy-200 shadow-md' : ''}`}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="pr-4 text-sm font-semibold text-gray-900">{faq.question}</span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="animate-fade-in border-t border-gray-100 px-5 pb-5">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}