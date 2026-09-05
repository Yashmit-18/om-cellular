import { useEffect, useState } from 'react'
import { History, X } from 'lucide-react'
import { inventoryService } from '../../services/inventory.service'

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [ledger, setLedger] = useState<any[] | null>(null)
  const [ledgerVariant, setLedgerVariant] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    const params: any = {}
    if (lowStockOnly) params.lowStock = 'true'
    inventoryService.getInventory(params).then(r => { setInventory(r.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [lowStockOnly])

  const openLedger = (inv: any) => {
    setLedgerVariant(inv)
    setLedger(null)
    inventoryService.getLedger({ variantId: String(inv.variantId?._id || inv.variantId), limit: '50' })
      .then(r => setLedger(r.data || []))
      .catch(() => setLedger([]))
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
            Low stock only (below threshold)
          </label>
        </div>
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50"><tr className="border-b">
              <th className="px-4 py-3 font-medium">Variant</th><th className="px-4 py-3 font-medium">Quantity</th><th className="px-4 py-3 font-medium">Low Stock Threshold</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>{inventory.map(inv => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{inv.variant?.name || String(inv.variantId)}</td>
                <td className="px-4 py-3">{inv.quantity}</td>
                <td className="px-4 py-3">{inv.lowStockThreshold}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${inv.quantity <= 0 ? 'badge-danger' : inv.quantity <= inv.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                    {inv.quantity <= 0 ? 'Out of Stock' : inv.quantity <= inv.lowStockThreshold ? 'Low Stock' : 'In Stock'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openLedger(inv)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><History className="h-3.5 w-3.5" /> Ledger</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {inventory.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No inventory records matched.</div>}
        </div>
      </div>

      {ledgerVariant && (
        <div className="w-96 shrink-0 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Stock Movement Ledger</h2>
            <button onClick={() => setLedgerVariant(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-sm text-gray-500">{ledgerVariant.variant?.name || String(ledgerVariant.variantId)}</p>
          <div className="mt-4 space-y-2">
            {ledger === null && <p className="text-sm text-gray-400">Loading…</p>}
            {ledger && ledger.length === 0 && <p className="text-sm text-gray-400">No movements recorded yet.</p>}
            {ledger && ledger.map((entry) => (
              <div key={entry._id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${entry.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{entry.delta >= 0 ? '+' : ''}{entry.delta}</span>
                  <span className="text-gray-500">{new Date(entry.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{entry.reason.replace(/_/g, ' ').toLowerCase()} · after: {entry.quantityAfter}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}