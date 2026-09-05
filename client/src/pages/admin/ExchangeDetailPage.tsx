import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

const STATUS_OPTIONS = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED', 'OFFER_MADE', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED']

const INSPECTION_ITEMS = ['display', 'touch', 'charging', 'battery', 'camera', 'speaker_mic', 'network', 'imei_matches', 'physical_damage', 'accessories_present', 'factory_reset', 'original_box_bill']

const INSPECTION_LABELS: Record<string, string> = {
  display: 'Display', touch: 'Touch screen', charging: 'Charging port', battery: 'Battery Health',
  camera: 'Camera', speaker_mic: 'Speaker & Mic', network: 'Network (calls/data)',
  imei_matches: 'IMEI matches device', physical_damage: 'No physical damage',
  accessories_present: 'Accessories present', factory_reset: 'Factory reset done',
  original_box_bill: 'Original box / bill',
}
const PAYOUT_MODES = ['UPI', 'BANK_TRANSFER', 'CASH', 'PAYTM_QR', 'STORE_CREDIT']

export default function AdminExchangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [finalValue, setFinalValue] = useState('')
  const [checklist, setChecklist] = useState<Record<string, string>>({})
  const [payout, setPayout] = useState({ amount: '', mode: 'UPI', reference: '', status: 'PENDING' })
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/exchange-requests/${id}`).then(r => {
      setRequest(r.data.data)
      if (r.data.data?.payout) setPayout({ amount: String(r.data.data.payout.amount ?? ''), mode: r.data.data.payout.mode || 'UPI', reference: r.data.data.payout.reference || '', status: r.data.data.payout.status === 'PAID' ? 'PAID' : 'PENDING' })
      if (r.data.data?.inspectionChecklist) setChecklist(r.data.data.inspectionChecklist)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!note.trim()) {
      toast.error('Please add a note describing the status change')
      return
    }
    const data: any = { status, note }
    if (estimatedValue && estimatedValue !== '' && (status === 'APPROVED' || status === 'INSPECTED')) data.estimatedExchangeValue = Number(estimatedValue)
    if (finalValue && finalValue !== '' && (status === 'OFFER_MADE' || status === 'OFFER_ACCEPTED' || status === 'INSPECTED')) data.finalExchangeValue = Number(finalValue)
    if (status === 'INSPECTED') {
      const filled = Object.entries(checklist).filter(([, v]) => v)
      if (filled.length < INSPECTION_ITEMS.length) {
        toast.error('Complete all inspection checklist items before marking INSPECTED')
        return
      }
      data.inspectionChecklist = Object.fromEntries(filled)
    }
    if (status === 'PAYMENT_PENDING' || status === 'COMPLETED') {
      const hasOutstanding = Number(finalValue || request.finalExchangeValue || 0) > 0
      if (payout.amount || hasOutstanding) {
        if (!payout.amount || Number(payout.amount) < 0) {
          toast.error('Enter a payout amount')
          return
        }
        data.payout = { amount: Number(payout.amount), mode: payout.mode, reference: payout.reference.trim() || undefined, status: status === 'COMPLETED' ? (payout.status === 'PAID' ? 'PAID' : 'PENDING') : 'PENDING' }
      }
    }
    setUpdating(true)
    try {
      const res = await api.put(`/exchange-requests/${id}`, data)
      setRequest(res.data.data)
      setNote('')
      setEstimatedValue('')
      setFinalValue('')
      toast.success(`Status changed to ${REQUEST_STATUS_LABELS[status]}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update request')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!payout.amount || Number(payout.amount) < 0) { toast.error('Enter a payout amount'); return }
    setUpdating(true)
    try {
      const res = await api.put(`/exchange-requests/${id}`, {
        status: 'COMPLETED',
        note: 'Payout marked as paid',
        payout: { amount: Number(payout.amount), mode: payout.mode, reference: payout.reference.trim() || undefined, status: 'PAID' },
      })
      setRequest(res.data.data)
      toast.success('Payout marked as paid')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update payout')
    } finally { setUpdating(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!request) return <div className="text-center py-12">Request not found</div>

  const hasOutstanding = Number(request.difference || 0) > 0
  const showChecklist = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED'].includes(request.status)
  const checklistComplete = Object.entries(checklist).filter(([, v]) => v).length >= INSPECTION_ITEMS.length

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/exchange-requests" className="hover:text-gray-900">Exchange Requests</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{request.requestNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{request.requestNumber}</h1>
        <span className={`badge ${REQUEST_STATUS_COLORS[request.status] || 'badge-info'}`}>{REQUEST_STATUS_LABELS[request.status] || request.status}</span>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold">Exchange Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Device</p><p className="font-medium">{request.oldBrand} {request.oldModel}</p></div>
              <div><p className="text-gray-500">Customer</p><p className="font-medium">{request.name || 'Guest'}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{request.phone || 'N/A'}</p></div>
              {request.alternatePhone && <div><p className="text-gray-500">Alt Phone</p><p className="font-medium">{request.alternatePhone}</p></div>}
              <div><p className="text-gray-500">Condition</p><p className="font-medium">{request.oldCondition}</p></div>
              {request.estimatedExchangeValue && <div><p className="text-gray-500">Est. Value</p><p className="font-medium">{formatPrice(request.estimatedExchangeValue)}</p></div>}
              {request.finalExchangeValue && <div><p className="text-gray-500">Final Value</p><p className="font-medium">{formatPrice(request.finalExchangeValue)}</p></div>}
              {request.difference !== undefined && <div><p className="text-gray-500">Balance Due</p><p className="font-medium">{formatPrice(request.difference)}</p></div>}
              <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(request.createdAt)}</p></div>
            </div>
            {request.oldImei && <div className="rounded-lg bg-gray-50 p-3 text-sm"><p className="text-xs font-semibold text-gray-500 uppercase">IMEI</p><p className="mt-0.5 font-mono">{request.oldImei}</p></div>}
            {request.adminNotes && <div><p className="text-gray-500 text-sm">Admin Notes</p><p className="mt-1 text-sm">{request.adminNotes}</p></div>}
            {request.pickupDetails && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">Pickup Details</p>
                <p className="mt-1">{request.pickupDetails.name}, {request.pickupDetails.phone}</p>
                <p>{request.pickupDetails.addressLine1}{request.pickupDetails.landmark ? ` (${request.pickupDetails.landmark})` : ''}</p>
                <p>{request.pickupDetails.city}, {request.pickupDetails.state} - {request.pickupDetails.pincode}</p>
              </div>
            )}
          </div>
          {Object.keys(request.inspectionChecklist || {}).length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Inspection Checklist</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(request.inspectionChecklist as Record<string, string>).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <span>{INSPECTION_LABELS[k] || k}</span>
                    <span className={`text-xs font-semibold ${v === 'PASS' ? 'text-emerald-600' : v === 'FAIL' ? 'text-red-500' : 'text-gray-400'}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {request.payout && (
            <div className="card p-6">
              <h2 className="font-semibold mb-1">Payout</h2>
              <p className="mb-3 text-xs text-gray-400">Disbursement record for this deal (pure buyback, when no balance is due).</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Amount</p><p className="font-medium">{formatPrice(request.payout.amount)}</p></div>
                <div><p className="text-gray-500">Mode</p><p className="font-medium">{request.payout.mode || 'N/A'}</p></div>
                <div><p className="text-gray-500">Reference</p><p className="font-medium">{request.payout.reference || 'N/A'}</p></div>
                <div><p className="text-gray-500">Status</p><p className={`font-medium ${request.payout.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>{request.payout.status}</p></div>
              </div>
              {request.payout.status === 'PENDING' && request.status === 'PAYMENT_PENDING' && (
                <button onClick={handleMarkPaid} disabled={updating} className="btn-primary mt-4 !text-xs disabled:opacity-40">Mark as PAID</button>
              )}
            </div>
          )}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Exchange Timeline</h2>
            <StatusTimeline history={request.statusHistory} labels={REQUEST_STATUS_LABELS} colors={REQUEST_STATUS_COLORS} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-2">Update Status</h2>
            <p className="mb-3 text-xs text-gray-400">A note is required and saved to the timeline.</p>
            <input value={note} onChange={e => setNote(e.target.value)} className="input mb-3 !py-2 text-sm" placeholder="Status update note (required)" />
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div><label className="block text-xs font-medium text-gray-600">Est. Value (₹, optional)</label><input value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} type="number" className="input mt-1 !py-2 text-sm" placeholder="e.g. 8000" /></div>
              <div><label className="block text-xs font-medium text-gray-600">Final Value (₹, optional)</label><input value={finalValue} onChange={e => setFinalValue(e.target.value)} type="number" className="input mt-1 !py-2 text-sm" placeholder="e.g. 9000" /></div>
            </div>

            {showChecklist && (
              <div className="mb-4 rounded-lg border border-gray-200 p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">Inspection Checklist{checklistComplete && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">Complete ✓</span>}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {INSPECTION_ITEMS.map(item => (
                    <label key={item} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1.5">
                      <span className="text-xs text-gray-700">{INSPECTION_LABELS[item]}</span>
                      <select value={checklist[item] || ''} onChange={e => setChecklist({ ...checklist, [item]: e.target.value })} className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px]">
                        <option value="">-</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option><option value="N/A">N/A</option>
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4 rounded-lg border border-gray-200 p-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Payout (used at PAYMENT_PENDING / COMPLETED; only for pure buyback){hasOutstanding && <span className="ml-1 text-amber-600"> — balance due {formatPrice(request.difference)} so exchange is store credit</span>}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div><label className="block text-[11px] text-gray-500">Amount (₹)</label><input value={payout.amount} onChange={e => setPayout({ ...payout, amount: e.target.value })} type="number" className="input mt-0.5 !py-1.5 text-sm" placeholder="e.g. 10000" /></div>
                <div><label className="block text-[11px] text-gray-500">Mode</label><select value={payout.mode} onChange={e => setPayout({ ...payout, mode: e.target.value })} className="input mt-0.5 !py-1.5 text-sm">{PAYOUT_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="sm:col-span-2"><label className="block text-[11px] text-gray-500">Reference / UPI txn ID (optional)</label><input value={payout.reference} onChange={e => setPayout({ ...payout, reference: e.target.value })} className="input mt-0.5 !py-1.5 text-sm" placeholder="e.g. 4221 8840 3311" /></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s} onClick={() => handleStatusUpdate(s)} disabled={updating} className={`btn-ghost !text-xs ${request.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{REQUEST_STATUS_LABELS[s] || s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}