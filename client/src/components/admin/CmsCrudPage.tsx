import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

export interface CmsField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
  options?: string[]
  placeholder?: string
  required?: boolean
}

interface CmsCrudPageProps {
  title: string
  endpoint: string
  singular: string
  fields: CmsField[]
  displayName: (item: any) => string
}

function defaultForm(fields: CmsField[]): Record<string, any> {
  const form: Record<string, any> = {}
  for (const f of fields) {
    form[f.name] = f.type === 'checkbox' ? true : f.type === 'number' ? 0 : ''
  }
  return form
}

export default function CmsCrudPage({ title, endpoint, singular, fields, displayName }: CmsCrudPageProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>(() => defaultForm(fields))

  const initial = useMemo(() => defaultForm(fields), [fields])

  const load = () => {
    api.get(`${endpoint}?includeAll=true`).then(r => { setItems(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [endpoint]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (name: string, value: any) => setForm(f => ({ ...f, [name]: value }))

  const startEdit = (item: any) => {
    const f: Record<string, any> = {}
    for (const field of fields) {
      f[field.name] = item[field.name] ?? initial[field.name]
    }
    setForm(f)
    setEditingId(item.id)
  }

  const cancelEdit = () => {
    setForm(initial)
    setEditingId(null)
  }

  const handleSubmit = async () => {
    const missing = fields.find(f => f.required && !form[f.name])
    if (missing) { toast.error(`${missing.label} is required`); return }
    setSaving(true)
    try {
      if (editingId) {
        const res = await api.put(`${endpoint}/${editingId}`, form)
        toast.success(`${singular} updated`)
        if (res.data.data) setItems(items.map(it => (it.id === editingId ? res.data.data : it)))
      } else {
        const res = await api.post(endpoint, form)
        toast.success(`${singular} created`)
        if (res.data.data) setItems([...items, res.data.data])
      }
      cancelEdit()
    } catch {
      toast.error(`Failed to save ${singular.toLowerCase()}`)
    } finally { setSaving(false) }
  }

  const toggleActive = async (item: any) => {
    try {
      const res = await api.put(`${endpoint}/${item.id}`, { isActive: !item.isActive })
      toast.success(item.isActive ? `${singular} disabled` : `${singular} enabled`)
      if (res.data.data) setItems(items.map(it => (it.id === item.id ? res.data.data : it)))
    } catch { toast.error('Failed to update status') }
  }

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete ${singular.toLowerCase()} "${displayName(item)}"?`)) return
    try {
      await api.delete(`${endpoint}/${item.id}`)
      toast.success('Deleted')
      setItems(items.filter(it => it.id !== item.id))
    } catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold">{editingId ? `Edit ${singular}` : `Add ${singular}`}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {fields.map(f => (
            <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.name] ?? ''} onChange={e => set(f.name, e.target.value)} placeholder={f.placeholder} rows={3} className="input mt-1" />
              ) : f.type === 'select' ? (
                <select value={form[f.name] ?? ''} onChange={e => set(f.name, e.target.value)} className="input mt-1">
                  {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <div className="mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={!!form[f.name]} onChange={e => set(f.name, e.target.checked)} className="h-4 w-4 accent-brand-600" />
                  <span className="text-sm text-gray-500">Enabled</span>
                </div>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={form[f.name] ?? ''} onChange={e => set(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={f.placeholder} className="input mt-1" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary"><Plus className="mr-1 h-4 w-4" /> {editingId ? 'Save Changes' : `Add ${singular}`}</button>
          {editingId && <button onClick={cancelEdit} className="btn-secondary">Cancel</button>}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.map(item => (
          <div key={item.id} className="card flex items-center justify-between p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{displayName(item)}</p>
              <span className={`badge ${item.isActive ? 'badge-success' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => toggleActive(item)} title={item.isActive ? 'Disable' : 'Enable'} className="text-gray-400 hover:text-brand-600"><Power className="h-4 w-4" /></button>
              <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(item)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-500">No {title.toLowerCase()} yet.</p>}
      </div>
    </div>
  )
}
