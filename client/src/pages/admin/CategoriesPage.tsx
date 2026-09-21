import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Edit, Search, Save, X, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoryService } from '../../services/category.service'
import type { Category } from '../../types'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', image: '', icon: '', sortOrder: 0 })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const r = await categoryService.getCategories()
      let data = r.data || []
      if (search) data = data.filter((c: Category) => c.name.toLowerCase().includes(search.toLowerCase()))
      setCategories(data)
    } catch { toast.error('Failed to load categories') } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Category name is required'); return }
    try {
      if (editingId) {
        await categoryService.updateCategory(editingId, form)
        toast.success('Category updated')
      } else {
        await categoryService.createCategory(form)
        toast.success('Category created')
      }
      setShowForm(false); setEditingId(null); setForm({ name: '', description: '', image: '', icon: '', sortOrder: 0 })
      fetchCategories()
    } catch { toast.error('Failed to save') }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setForm({ name: category.name, description: category.description || '', image: category.image || '', icon: category.icon || '', sortOrder: category.sortOrder })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this category?')) return
    try { await categoryService.deleteCategory(id); toast.success('Deactivated'); fetchCategories() } catch { toast.error('Failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Manage product categories displayed on the website</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', image: '', icon: '', sortOrder: 0 }) }}
          className="btn-primary"><Plus className="mr-1 h-4 w-4" /> Add Category</button>
      </div>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input !pl-10" placeholder="Search categories..." />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Category Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" placeholder="e.g. Smartphones" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="input mt-1" placeholder="Short description" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Image URL</label><input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="input mt-1" placeholder="https://..." /></div>
              <div><label className="block text-sm font-medium text-gray-700">Icon</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="input mt-1" placeholder="Category icon" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Sort Order</label><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="input mt-1" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1"><Save className="mr-1 h-4 w-4" /> {editingId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
      ) : categories.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map(category => (
            <div key={category.id || category._id} className="card-premium flex items-center gap-3 p-4">
              {category.image ? (
                <img src={category.image} alt={category.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <FolderOpen className="h-5 w-5 text-brand-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{category.name}</p>
                <p className="text-xs text-gray-500">{category._count?.products || 0} products</p>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => handleEdit(category)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(category.id || category._id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 card p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Categories</h3>
          <p className="mt-2 text-sm text-gray-500">Add categories to organize your products.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus className="mr-1 h-4 w-4" /> Add First Category</button>
        </div>
      )}
    </div>
  )
}