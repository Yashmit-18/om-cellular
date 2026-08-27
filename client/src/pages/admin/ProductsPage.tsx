import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const params: Record<string, string> = { limit: '50' }
    if (query) params.query = query
    const qs = new URLSearchParams(params).toString()
    api.get(`/products?${qs}`).then(r => { setProducts(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [query])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await api.delete(`/products/${id}`)
    setProducts(products.filter(p => p.id !== id))
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="btn-primary text-sm"><Plus className="mr-1 h-4 w-4" /> Add Product</button>
      </div>
      <div className="mt-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." className="input !pl-10" />
        </div>
      </div>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Stock</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3"><Link to={`/admin/products/${p.id}`} className="font-medium text-brand-600 hover:text-brand-700">{p.name}</Link></td>
              <td className="px-4 py-3">{formatPrice(p.lowestPrice || 0)}</td>
              <td className="px-4 py-3">{p.variantCount || 0} variants</td>
              <td className="px-4 py-3"><span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-3"><div className="flex gap-2">
                <Link to={`/admin/products/${p.id}`} className="text-gray-400 hover:text-brand-600"><Edit className="h-4 w-4" /></Link>
                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
