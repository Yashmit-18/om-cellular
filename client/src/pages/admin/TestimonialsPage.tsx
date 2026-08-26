import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ customerName: '', comment: '', rating: 5 })

  useEffect(() => {
    api.get('/cms/testimonials').then(r => { setTestimonials(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.customerName || !form.comment) { toast.error('Name and comment required'); return }
    try {
      const res = await api.post('/cms/testimonials', form)
      setTestimonials([...testimonials, res.data.data])
      setForm({ customerName: '', comment: '', rating: 5 })
      toast.success('Created')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await api.delete(`/cms/testimonials/${id}`)
    setTestimonials(testimonials.filter(t => t.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Testimonials</h1>
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Add Testimonial</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Customer Name" className="input" />
          <input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="input" />
          <input value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Comment" className="input" />
        </div>
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add</button>
      </div>
      <div className="mt-6 space-y-3">
        {testimonials.map(t => (
          <div key={t.id} className="card flex items-center justify-between p-4">
            <div><p className="font-medium">{t.customerName}</p><p className="text-sm text-gray-500">Rating: {t.rating}/5</p><p className="text-sm">{t.comment}</p></div>
            <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
