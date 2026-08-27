import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'

export default function AdminPhoneValuationPage() {
  const [valuations, setValuations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/phone-valuation').then(r => { setValuations(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Phone Valuations</h1>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Brand</th><th className="px-4 py-3 font-medium">Model</th><th className="px-4 py-3 font-medium">Condition</th><th className="px-4 py-3 font-medium">Value</th><th className="px-4 py-3 font-medium">Date</th>
          </tr></thead>
          <tbody>{valuations.map(v => (
            <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3">{v.brand}</td>
              <td className="px-4 py-3">{v.model}</td>
              <td className="px-4 py-3">{v.condition}</td>
              <td className="px-4 py-3 font-medium">{v.estimatedValue ? formatPrice(v.estimatedValue) : 'N/A'}</td>
              <td className="px-4 py-3">{formatDate(v.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
