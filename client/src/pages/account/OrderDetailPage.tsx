import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, Clock, MapPin, FileText, XCircle, RotateCcw, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { orderService } from '../../services/order.service'
import { returnService, warrantyService } from '../../services/returnRequest.service'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

export default function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelNote, setCancelNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [warranties, setWarranties] = useState<any[]>([])
  const [returning, setReturning] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returnItems, setReturnItems] = useState<string[]>([])
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const itemIds = useMemo(() => (order?.items?.length ? order.items.map((i: any) => String(i.id)) : []), [order])

  useEffect(() => {
    if (!id) return
    api.get(`/orders/${id}`).then(r => { setOrder(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || !order) return
    warrantyService.getWarrantiesByOrder(id).then(r => setWarranties(r.data || [])).catch(() => setWarranties([]))
  }, [id, order])

  const CANCELABLE = ['PENDING', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP']
  const RETURNABLE = ['DELIVERED']

  const handleCancelRequest = async () => {
    if (!id) return
    if (!cancelNote.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }
    setSubmitting(true)
    try {
      const res = await orderService.cancelRequest(id, cancelNote.trim())
      setOrder(res.data)
      setCancelNote('')
      toast.success('Cancellation requested. We will confirm shortly.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not request cancellation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvoice = async () => {
    if (!id) return
    try {
      const blob = await orderService.invoice(id)
      const url = URL.createObjectURL(blob as Blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not download invoice')
    }
  }

  const handleReturn = async () => {
    if (!order || !id) return
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return')
      return
    }
    const selected = order.items
      .filter((i: any) => returnItems.includes(String(i.id)))
      .map((i: any) => ({ itemId: String(i.id), quantity: i.quantity }))
    if (!selected.length) {
      toast.error('Select at least one item to return')
      return
    }
    setReturnSubmitting(true)
    try {
      await returnService.createReturn({
        orderId: id,
        reason: returnReason.trim(),
        items: selected,
      })
      setReturning(false)
      setReturnReason('')
      setReturnItems([])
      toast.success('Return requested. Our team will review it shortly.')
      const res = await orderService.getOrder(id)
      setOrder(res.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not request a return')
    } finally {
      setReturnSubmitting(false)
    }
  }

  const handleWarrantyClaim = async (warrantyId: string) => {
    setClaimingId(warrantyId)
    try {
      await warrantyService.claimWarranty(warrantyId)
      toast.success('Warranty claim registered. Our service team will contact you.')
      const r = await warrantyService.getWarrantiesByOrder(id!)
      setWarranties(r.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not register warranty claim')
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!order) return <div className="text-center py-12 text-gray-500">Order not found</div>

  const address = order.shippingAddress || order.address

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/account/orders" className="hover:text-gray-900">Orders</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">{order.orderNumber}</span>
      </nav>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <div className="flex items-center gap-2">
          <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
          <button onClick={handleInvoice} className="btn-secondary !px-3 !py-1.5 !text-sm"><FileText className="mr-1 h-4 w-4" /> Invoice</button>
        </div>
      </div>
      {CANCELABLE.includes(order.status) && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-700"><XCircle className="mr-1 inline h-4 w-4" /> Cancel this order</p>
              <input value={cancelNote} onChange={e => setCancelNote(e.target.value)} className="input mt-2 !py-2 text-sm" placeholder="Reason for cancellation" />
            </div>
            <button onClick={handleCancelRequest} disabled={submitting} className="btn-danger !px-4 !py-2 text-sm">{submitting ? 'Requesting…' : 'Request Cancellation'}</button>
          </div>
        </div>
      )}
      {order.paymentStatus === 'PENDING_PAYMENT' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Payment pending verification</p>
            <p className="mt-0.5 text-xs text-amber-700">We are verifying your UPI payment. Your order will be confirmed and moved to "Paid" shortly.</p>
          </div>
        </div>
      )}
      {RETURNABLE.includes(order.status) && order.paymentStatus !== 'REFUNDED' && (
        <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/40 p-4">
          {!returning ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-brand-800"><RotateCcw className="mr-1 inline h-4 w-4" /> Return this order</p>
                <p className="mt-0.5 text-xs text-brand-700">Items delivered can be returned. Refunds are processed after we receive and inspect the return.</p>
              </div>
              <button onClick={() => { setReturning(true); setReturnItems(itemIds) }} className="btn-secondary !px-4 !py-2 text-sm">Start Return</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-brand-900">Select items to return</p>
              {order.items.map((item: any) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={returnItems.includes(String(item.id))} onChange={e => setReturnItems(prev => e.target.checked ? [...prev, String(item.id)] : prev.filter(p => p !== String(item.id)))} />
                  <span>{item.variant?.name || item.variantId?.name || item.variantId} (Qty: {item.quantity})</span>
                </label>
              ))}
              <select value={returnReason} onChange={e => setReturnReason(e.target.value)} className="input !py-2 text-sm">
                <option value="">Select a reason</option>
                <option value="damaged">Damaged / defective product received</option>
                <option value="wrong">Wrong item received</option>
                <option value="changed">Changed my mind</option>
                <option value="quality">Quality not as expected</option>
                <option value="other">Other</option>
              </select>
              <div className="flex items-center gap-2">
                <button onClick={handleReturn} disabled={returnSubmitting} className="btn-primary !px-4 !py-2 text-sm">{returnSubmitting ? 'Submitting…' : 'Submit Return'}</button>
                <button onClick={() => { setReturning(false); setReturnItems([]); setReturnReason('') }} className="btn-ghost !px-4 !py-2 text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {warranties.length > 0 && (
        <div className="mt-4 card p-4">
          <h3 className="flex items-center gap-2 font-semibold mb-3"><ShieldCheck className="h-4 w-4 text-green-600" /> Warranty</h3>
          <div className="space-y-3">
            {warranties.map((w: any) => (
              <div key={w._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 text-sm">
                <div>
                  <p className="font-medium">{w.warrantyNumber}</p>
                  <p className="text-xs text-gray-500">{w.variantName || 'Product'} · {w.durationMonths} months · until {formatDate(w.expiresAt)}</p>
                </div>
                <span className={`badge ${w.status === 'ACTIVE' ? 'badge-success' : w.status === 'CLAIMED' ? 'badge-warning' : 'badge-info'}`}>{w.status}</span>
                {w.status === 'ACTIVE' && (
                  <button onClick={() => handleWarrantyClaim(w._id)} disabled={claimingId === w._id} className="btn-secondary !px-3 !py-1.5 !text-xs">Claim Warranty</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(order.createdAt)}</p></div>
          <div>
            <p className="text-gray-500">Payment</p>
            <p className="font-medium capitalize">
              {order.paymentMethod === 'upi' ? 'UPI / Online' : order.paymentMethod || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Payment Status</p>
            <span className={`badge ${PAYMENT_STATUS_COLORS[order.paymentStatus] || 'badge-info'}`}>{order.paymentStatus}</span>
          </div>
          {order.upiReferenceId && <div><p className="text-gray-500">UPI Reference</p><p className="font-medium">{order.upiReferenceId}</p></div>}
          {order.trackingNumber && <div><p className="text-gray-500">Tracking</p><p className="font-medium">{order.trackingNumber}</p></div>}
          {order.paymentGateway && <div><p className="text-gray-500">Gateway</p><p className="font-medium capitalize">{order.paymentGateway}</p></div>}
        </div>
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Order Timeline</h3>
            <StatusTimeline history={order.statusHistory} labels={ORDER_STATUS_LABELS} colors={ORDER_STATUS_COLORS} />
          </div>
        )}
        {address && (
          <div className="border-t pt-4">
            <h3 className="flex items-center gap-1 font-semibold mb-2"><MapPin className="h-4 w-4 text-brand-500" /> Delivery Address</h3>
            <p className="text-sm text-gray-600">{address.name}, {address.phone}</p>
            {address.alternatePhone && <p className="text-sm text-gray-600">Alt: {address.alternatePhone}</p>}
            <p className="text-sm text-gray-600">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}{address.landmark ? ` (${address.landmark})` : ''}, {address.city}, {address.state} - {address.pincode}</p>
          </div>
        )}
        {order.items && order.items.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium">{item.variant?.name || item.variantId?.name || item.variantId}</p><p className="text-gray-500">Qty: {item.quantity}</p></div>
                  <p className="font-medium">{formatPrice(item.total)}</p>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between font-bold">
              <span>Total</span><span>{formatPrice(order.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}