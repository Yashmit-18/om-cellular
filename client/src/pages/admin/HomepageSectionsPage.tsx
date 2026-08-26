import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AdminHomepageSectionsPage() {
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', subtitle: '', type: 'featured_products', sortOrder: 0, isActive: true })

  useEffect(() => {
    api.get('/cms/homepage-sections').then(r => { setSections(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title required'); return }
    try {
      const res = await api.post('/cms/homepage-sections', form)
      setSections([...sections, res.data.data])
      setForm({ title: '', subtitle: '', type: 'featured_products', sortOrder: 0, isActive: true })
      toast.success('Section created')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await api.delete(`/cms/homepage-sections/${id}`)
    setSections(sections.filter(s => s.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Homepage Sections</h1>
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Add Section</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input" />
          <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="input" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
            <option value="featured_products">Featured Products</option><option value="new_arrivals">New Arrivals</option><option value="best_sellers">Best Sellers</option><option value="categories">Categories</option><option value="custom">Custom</option>
          </select>
        </div>
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add Section</button>
      </div>
      <div className="mt-6 space-y-3">
        {sections.map(s => (
          <div key={s.id} className="card flex items-center justify-between p-4">
            <div><p className="font-medium">{s.title}</p><p className="text-sm text-gray-500">{s.type} - Order: {s.sortOrder}</p></div>
            <div className="flex items-center gap-3">
              <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
              <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
