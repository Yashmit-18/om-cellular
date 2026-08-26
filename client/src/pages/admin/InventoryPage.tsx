import { useEffect, useState } from 'react'
import api from '../../services/api'

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/inventory').then(r => { setInventory(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Inventory</h1>
      <div className="mt-6 card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Variant</th><th className="px-4 py-3 font-medium">Quantity</th><th className="px-4 py-3 font-medium">Low Stock Threshold</th><th className="px-4 py-3 font-medium">Status</th>
          </tr></thead>
          <tbody>{inventory.map(inv => (
            <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3">{inv.variant?.name || inv.variantId}</td>
              <td className="px-4 py-3">{inv.quantity}</td>
              <td className="px-4 py-3">{inv.lowStockThreshold}</td>
              <td className="px-4 py-3">
                <span className={`badge ${inv.quantity <= 0 ? 'badge-danger' : inv.quantity <= inv.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                  {inv.quantity <= 0 ? 'Out of Stock' : inv.quantity <= inv.lowStockThreshold ? 'Low Stock' : 'In Stock'}
                </span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
