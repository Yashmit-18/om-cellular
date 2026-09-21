import { useCallback, useEffect, useState } from 'react'
import { History, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventoryService } from '../../services/inventory.service'

function specSummary(inv: any): string {
  const parts = [inv.storage, inv.ram, inv.color].filter(Boolean)
  return parts.join(' · ')
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [ledger, setLedger] = useState<any[] | null>(null)
  const [ledgerVariant, setLedgerVariant] = useState<any>(null)
  const [adjustTarget, setAdjustTarget] = useState<any>(null)
  const [adjustForm, setAdjustForm] = useState<{ quantity: string; note: string; lowStockThreshold: string }>({ quantity: '', note: '', lowStockThreshold: '' })
  const [adjustSaving, setAdjustSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params: any = {}
    if (lowStockOnly) params.lowStock = 'true'
    params.limit = '100'
    inventoryService.getInventory(params)
      .then(r => setInventory(r.data || []))
      .catch(() => setInventory([]))
      .finally(() => setLoading(false))
  }, [lowStockOnly])

  useEffect(() => { load() }, [load])

  const openLedger = (inv: any) => {
    setLedgerVariant(inv)
    setLedger(null)
    inventoryService.getLedger({ variantId: String(inv.variantId?._id || inv.variantId), limit: '50' })
      .then(r => setLedger(r.data || []))
      .catch(() => setLedger([]))
  }

  const openAdjust = (inv: any) => {
    setAdjustForm({ quantity: String(inv.quantity ?? ''), note: '', lowStockThreshold: String(inv.lowStockThreshold ?? '') })
    setAdjustTarget(inv)
  }

  const handleAdjustSave = async () => {
    if (!adjustTarget) return
    const quantity = Number(adjustForm.quantity)
    if (adjustForm.quantity.trim() === '' || !Number.isFinite(quantity) || quantity < 0) {
      toast.error('Stock must be a non-negative number'); return
    }
    const note = adjustForm.note.trim()
    if (!note) { toast.error('A note is required when adjusting stock'); return }
    const threshold = adjustForm.lowStockThreshold.trim()
    if (threshold !== '' && (!Number.isFinite(Number(threshold)) || Number(threshold) < 0)) {
      toast.error('Low stock threshold must be a non-negative number'); return
    }

    setAdjustSaving(true)
    try {
      await inventoryService.updateInventory([{
        variantId: adjustTarget.id,
        quantity,
        note,
        lowStockThreshold: threshold !== '' ? Number(threshold) : undefined,
      }])
      toast.success('Stock updated')
      setAdjustTarget(null)
      load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update stock')
    } finally {
      setAdjustSaving(false)
    }
  }

  const query = search.trim().toLowerCase()
  const visible = query
    ? inventory.filter(inv =>
        (inv.variant?.name || String(inv.variant?.id || inv.variantId || '')).toLowerCase().includes(query) ||
        (inv.variant?.productId?.name || '').toLowerCase().includes(query) ||
        (inv.sku || '').toLowerCase().includes(query))
    : inventory

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-56"
              placeholder="Search variant, product or SKU"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
              Low stock only (below threshold)
            </label>
          </div>
        </div>
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-gray-50"><tr className="border-b">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Variant</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Condition</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Low Stock Threshold</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last Adjusted</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>{visible.map(inv => (
              <tr key={inv.id} className={`border-b last:border-0 hover:bg-gray-50 ${inv.isActive === false ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">{inv.variant?.productId?.name || '—'}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{inv.variant?.name || String(inv.variantId)}</p>
                  {specSummary(inv) && <p className="text-xs text-gray-500">{specSummary(inv)}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{inv.sku || '—'}</td>
                <td className="px-4 py-3 capitalize">{inv.condition || '—'}</td>
                <td className="px-4 py-3 font-semibold">{inv.quantity}</td>
                <td className="px-4 py-3">{inv.lowStockThreshold}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`badge ${inv.quantity <= 0 ? 'badge-danger' : inv.quantity <= inv.lowStockThreshold ? 'badge-warning' : 'badge-success'}`}>
                      {inv.quantity <= 0 ? 'Out of Stock' : inv.quantity <= inv.lowStockThreshold ? 'Low Stock' : 'In Stock'}
                    </span>
                    {inv.isActive === false && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Variant inactive</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {inv.lastAdjustedAt ? (
                    <>
                      <p className="text-xs">{new Date(inv.lastAdjustedAt).toLocaleString('en-IN')}</p>
                      <p className="text-xs capitalize text-gray-500">{(inv.lastReason || '').replace(/_/g, ' ').toLowerCase()}</p>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => openAdjust(inv)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><Pencil className="h-3.5 w-3.5" /> Adjust</button>
                    <button onClick={() => openLedger(inv)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"><History className="h-3.5 w-3.5" /> Ledger</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {visible.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No inventory records matched.</div>}
        </div>
      </div>

      {ledgerVariant && (
        <div className="w-full max-w-md shrink-0 rounded-xl border border-gray-200 bg-white p-4 sm:w-96 sm:max-w-none">
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
                {entry.note && <p className="mt-0.5 text-xs italic text-gray-500">{entry.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adjust Stock</h2>
              <button onClick={() => setAdjustTarget(null)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-sm text-gray-500">{adjustTarget.variant?.name} · SKU {adjustTarget.sku || '—'}</p>
            <p className="mt-0.5 text-xs text-gray-500">Current stock: {adjustTarget.quantity}</p>
            <div className="mt-4 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">New Stock (absolute) *</label><input type="number" min="0" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} className="input mt-1" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Reason / Note *</label><textarea rows={3} value={adjustForm.note} onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })} className="input mt-1" placeholder="Why is this stock being changed? This is recorded in the ledger." /></div>
              <div><label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label><input type="number" min="0" value={adjustForm.lowStockThreshold} onChange={e => setAdjustForm({ ...adjustForm, lowStockThreshold: e.target.value })} className="input mt-1" placeholder="Defaults to 5 if left blank" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAdjustTarget(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdjustSave} disabled={adjustSaving} className="btn-primary flex-1">{adjustSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}