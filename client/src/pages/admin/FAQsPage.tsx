import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AdminFAQsPage() {
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ question: '', answer: '', category: '' })

  useEffect(() => {
    api.get('/cms/faqs').then(r => { setFaqs(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer required'); return }
    try {
      const res = await api.post('/cms/faqs', form)
      setFaqs([...faqs, res.data.data])
      setForm({ question: '', answer: '', category: '' })
      toast.success('Created')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await api.delete(`/cms/faqs/${id}`)
    setFaqs(faqs.filter(f => f.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">FAQs</h1>
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Add FAQ</h2>
        <div className="mt-4 space-y-4">
          <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Question" className="input" />
          <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Answer" className="input" rows={3} />
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category (optional)" className="input" />
        </div>
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add FAQ</button>
      </div>
      <div className="mt-6 space-y-3">
        {faqs.map(f => (
          <div key={f.id} className="card flex items-start justify-between p-4">
            <div className="flex-1"><p className="font-medium">{f.question}</p><p className="text-sm text-gray-500 mt-1">{f.answer}</p></div>
            <button onClick={() => handleDelete(f.id)} className="ml-4 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
