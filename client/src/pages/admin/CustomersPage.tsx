import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate } from '../../utils'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/customers').then(r => { setCustomers(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Customers</h1>
      <div className="mt-6 card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Phone</th><th className="px-4 py-3 font-medium">Joined</th>
          </tr></thead>
          <tbody>{customers.map(c => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{c.name || 'N/A'}</td>
              <td className="px-4 py-3">{c.email || 'N/A'}</td>
              <td className="px-4 py-3">{c.phone || 'N/A'}</td>
              <td className="px-4 py-3">{formatDate(c.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
