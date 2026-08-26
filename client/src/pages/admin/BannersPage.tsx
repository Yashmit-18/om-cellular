import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', ctaText: '', ctaLink: '', isActive: true })

  useEffect(() => {
    api.get('/cms/banners').then(r => { setBanners(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.title || !form.image) { toast.error('Title and image required'); return }
    try {
      const res = await api.post('/cms/banners', form)
      setBanners([...banners, res.data.data])
      setForm({ title: '', subtitle: '', image: '', ctaText: '', ctaLink: '', isActive: true })
      toast.success('Banner created')
    } catch { toast.error('Failed to create banner') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete banner?')) return
    await api.delete(`/cms/banners/${id}`)
    setBanners(banners.filter(b => b.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Banners</h1>
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Add Banner</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input" />
          <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="input" />
          <input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="Image URL" className="input" />
          <input value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} placeholder="CTA Text" className="input" />
          <input value={form.ctaLink} onChange={e => setForm({ ...form, ctaLink: e.target.value })} placeholder="CTA Link" className="input" />
        </div>
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add Banner</button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {banners.map(b => (
          <div key={b.id} className="card p-4 flex items-center gap-4">
            <img src={b.image} alt={b.title} className="h-20 w-40 rounded object-cover" />
            <div className="flex-1"><p className="font-medium">{b.title}</p><p className="text-sm text-gray-500">{b.subtitle}</p></div>
            <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
