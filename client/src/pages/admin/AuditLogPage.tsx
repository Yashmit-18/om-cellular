import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatDate } from '../../utils'

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/audit-logs').then(r => { setLogs(r.data.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="mt-6 card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50"><tr className="border-b">
            <th className="px-4 py-3 font-medium">Action</th><th className="px-4 py-3 font-medium">Entity</th><th className="px-4 py-3 font-medium">Admin</th><th className="px-4 py-3 font-medium">IP</th><th className="px-4 py-3 font-medium">Date</th>
          </tr></thead>
          <tbody>{logs.map(l => (
            <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{l.action}</td>
              <td className="px-4 py-3">{l.entity}{l.entityId ? ` (${l.entityId.slice(0, 8)})` : ''}</td>
              <td className="px-4 py-3">{l.admin?.name || 'System'}</td>
              <td className="px-4 py-3 text-gray-500">{l.ipAddress || 'N/A'}</td>
              <td className="px-4 py-3">{formatDate(l.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
