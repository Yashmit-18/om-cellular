import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../services/api'
import type { FAQ } from '../../types'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/faqs').then(r => setFaqs(r.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-center">Frequently Asked Questions</h1>
      <p className="mt-2 text-center text-gray-500">Find answers to common questions</p>
      <div className="mt-8 space-y-3">
        {faqs.map(faq => (
          <div key={faq.id} className="card overflow-hidden">
            <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)} className="flex w-full items-center justify-between p-5 text-left">
              <span className="text-sm font-medium text-gray-900">{faq.question}</span>
              {openId === faq.id ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
            </button>
            {openId === faq.id && (
              <div className="px-5 pb-5 text-sm text-gray-600 whitespace-pre-line">{faq.answer}</div>
            )}
          </div>
        ))}
        {faqs.length === 0 && <p className="text-center text-gray-500">No FAQs available.</p>}
      </div>
    </div>
  )
}
