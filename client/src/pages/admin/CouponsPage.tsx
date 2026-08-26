import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatDate } from '../../utils'

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: '', type: 'percentage', value: 0, minOrderAmount: 0, maxDiscount: 0, usageLimit: 0, expiresAt: '', isActive: true })

  useEffect(() => {
    api.get('/coupons').then(r => { setCoupons(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.code || !form.value) { toast.error('Code and value required'); return }
    try {
      const res = await api.post('/coupons', form)
      setCoupons([...coupons, res.data.data])
      setForm({ code: '', type: 'percentage', value: 0, minOrderAmount: 0, maxDiscount: 0, usageLimit: 0, expiresAt: '', isActive: true })
      toast.success('Coupon created')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return
    await api.delete(`/coupons/${id}`)
    setCoupons(coupons.filter(c => c.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Coupons</h1>
      <div className="mt-6 card p-6">
        <h2 className="font-semibold">Add Coupon</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Code" className="input" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select>
          <input type="number" value={form.value || ''} onChange={e => setForm({ ...form, value: Number(e.target.value) })} placeholder="Value" className="input" />
          <input type="number" value={form.minOrderAmount || ''} onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) })} placeholder="Min Order Amount" className="input" />
          <input type="number" value={form.maxDiscount || ''} onChange={e => setForm({ ...form, maxDiscount: Number(e.target.value) })} placeholder="Max Discount" className="input" />
          <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="input" />
        </div>
        <button onClick={handleCreate} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add Coupon</button>
      </div>
      <div className="mt-6 card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Value</th><th className="px-4 py-3 font-medium">Used</th><th className="px-4 py-3 font-medium">Expires</th><th className="px-4 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>{coupons.map(c => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{c.code}</td>
              <td className="px-4 py-3 capitalize">{c.type}</td>
              <td className="px-4 py-3">{c.type === 'percentage' ? `${c.value}%` : `Rs. ${c.value}`}</td>
              <td className="px-4 py-3">{c.usedCount}/{c.usageLimit || '∞'}</td>
              <td className="px-4 py-3">{c.expiresAt ? formatDate(c.expiresAt) : 'N/A'}</td>
              <td className="px-4 py-3"><button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
