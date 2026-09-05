import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, MapPin, RefreshCcw, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { orderService } from '../../services/order.service'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS } from '../../constants'
import StatusTimeline from '../../components/StatusTimeline'

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/orders/${id}`).then(r => {
      setOrder(r.data.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!note.trim()) {
      toast.error('Please add a note describing the status change')
      return
    }
    setUpdating(true)
    try {
      const res = await api.put(`/orders/${id}`, { status, note })
      setOrder(res.data.data)
      setNote('')
      toast.success(`Order moved to ${ORDER_STATUS_LABELS[status] || status}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update order status')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveTracking = async () => {
    setUpdating(true)
    try {
      const res = await api.put(`/orders/${id}`, { trackingNumber })
      setOrder(res.data.data)
      toast.success('Tracking number saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save tracking number')
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentUpdate = async (paymentStatus: string) => {
    setUpdating(true)
    try {
      const res = await api.put(`/orders/${id}`, { paymentStatus, note: `Admin marked payment as ${paymentStatus}` })
      setOrder(res.data.data)
      toast.success(`Payment marked as ${paymentStatus}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update payment status')
    } finally {
      setUpdating(false)
    }
  }

  const handleApproveCancellation = async () => {
    if (!id) return
    if (!window.confirm('Approve cancellation? Stock and coupon will be restored.')) return
    setUpdating(true)
    try {
      const res = await orderService.adminCancel(id, note.trim() || 'Cancellation approved by admin')
      setOrder(res.data)
      setNote('')
      toast.success('Order cancelled; stock restored')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not cancel order')
    } finally {
      setUpdating(false)
    }
  }

  const handleRefund = async () => {
    if (!id) return
    if (!window.confirm('Initiate a refund for this order? This charges you gateway fees and cannot be undone.')) return
    setUpdating(true)
    try {
      const res = await orderService.refund(id)
      setOrder(res.data.data)
      toast.success('Refund initiated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not initiate refund')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>
  if (!order) return <div className="text-center py-12">Order not found</div>

  const address = order.shippingAddress || order.address

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/orders" className="hover:text-gray-900">Orders</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{order.orderNumber}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <div className="flex items-center gap-2">
          <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
          <span className={`badge ${PAYMENT_STATUS_COLORS[order.paymentStatus] || 'badge-info'}`}>{order.paymentStatus}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Items</h2>
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between border-b py-3 text-sm last:border-0">
                <div><p className="font-medium">{item.variant?.name || item.variantId?.name || item.variantId}</p><p className="text-gray-500">Qty: {item.quantity}</p></div>
                <p className="font-medium">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
          {address && (
            <div className="card p-6">
              <h2 className="flex items-center gap-1 font-semibold mb-2"><MapPin className="h-4 w-4 text-brand-500" /> Shipping Address</h2>
              <p className="text-sm text-gray-600">{address.name}, {address.phone}</p>
              {address.alternatePhone && <p className="text-sm text-gray-600">Alt: {address.alternatePhone}</p>}
              <p className="text-sm text-gray-600">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}{address.landmark ? ` (${address.landmark})` : ''}, {address.city}, {address.state} - {address.pincode}</p>
            </div>
          )}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Order Timeline</h2>
            <StatusTimeline history={order.statusHistory} labels={ORDER_STATUS_LABELS} colors={ORDER_STATUS_COLORS} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.total - order.shipping - order.tax + order.discount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{formatPrice(order.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div>
              {order.couponDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon</span><span>-{formatPrice(order.couponDiscount)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Payment Method</span><span className="capitalize">{order.paymentMethod === 'upi' ? 'UPI / Online' : order.paymentMethod || 'N/A'}</span></div>
              {order.upiReferenceId && <div className="flex justify-between"><span className="text-gray-500">UPI Reference</span><span>{order.upiReferenceId}</span></div>}
              {order.paymentGateway && <div className="flex justify-between"><span className="text-gray-500">Gateway</span><span className="capitalize">{order.paymentGateway}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{formatDate(order.createdAt)}</span></div>
            </div>
            {order.paymentStatus === 'PENDING_PAYMENT' && (
              <div className="mt-4">
                <button onClick={() => handlePaymentUpdate('PAID')} disabled={updating} className="btn-primary w-full !text-sm">Mark as Paid</button>
                <button onClick={() => handlePaymentUpdate('FAILED')} disabled={updating} className="btn-ghost mt-2 w-full !text-sm text-red-500">Mark as Failed</button>
              </div>
            )}
            {order.status === 'CANCEL_REQUESTED' && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3">
                <p className="mb-2 text-sm font-medium text-amber-800">Customer requested cancellation</p>
                <button onClick={handleApproveCancellation} disabled={updating} className="btn-danger w-full !text-sm"><Undo2 className="mr-1 inline h-4 w-4" /> Approve & Cancel</button>
              </div>
            )}
            {(order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING') && !['CANCELLED', 'REFUNDED', 'FAILED', 'REFUND_PENDING'].includes(order.status) && (
              <div className="mt-4">
                <button onClick={handleRefund} disabled={updating} className="btn-secondary w-full !text-sm"><RefreshCcw className="mr-1 inline h-4 w-4" /> Initiate Refund</button>
              </div>
            )}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-2">Update Status</h2>
            <p className="mb-3 text-xs text-gray-400">A note is required and saved to the order timeline.</p>
            <input value={note} onChange={e => setNote(e.target.value)} className="input mb-3 !py-2 text-sm" placeholder="Status update note (required)" />
            <div className="flex flex-wrap gap-2">
              {[...['PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'], ...(order.status === 'CANCEL_REQUESTED' ? ['CANCEL_REQUESTED'] : []), ...(['DELIVERED', 'RETURN_REQUESTED'].includes(order.status) ? ['RETURN_APPROVED'] : []), ...(['CANCEL_REQUESTED', 'RETURN_APPROVED', 'DELIVERED'].includes(order.status) ? ['REFUND_PENDING'] : [])].map(s => (
                <button key={s} onClick={() => handleStatusUpdate(s)} disabled={updating} className={`btn-ghost !text-xs ${order.status === s ? 'bg-brand-50 text-brand-600' : ''}`}>{ORDER_STATUS_LABELS[s] || s}</button>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <h3 className="mb-2 text-sm font-semibold">Tracking Number</h3>
              <div className="flex gap-2">
                <input value={trackingNumber || order.trackingNumber || ''} onChange={e => setTrackingNumber(e.target.value)} className="input !py-2 text-sm" placeholder="Courier tracking ID" />
                <button onClick={handleSaveTracking} disabled={updating} className="btn-secondary !px-3 !py-2 text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}