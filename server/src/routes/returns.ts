import { Router, Response } from 'express'
import { ReturnRequest } from '../models/returnRequest.model'
import { Order, OrderItem } from '../models/order.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateReturnNumber, paginate } from '../utils/helpers'
import { writeAudit, serializeAuditValue } from '../services/audit.service'
import { notify } from '../services/notification.service'
import { POST_DELIVERY_STATES, assertTransition, ORDER_TRANSITIONS, RETURN_REQUEST_TRANSITIONS } from '../services/fsm.service'
import { restoreStockAndCoupon } from '../services/orderLifecycle.service'

const router = Router()

function pushReturnHistory(returnRequest: any, status: string, changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN', note?: string) {
  returnRequest.statusHistory = returnRequest.statusHistory || []
  returnRequest.statusHistory.push({ status, changedAt: new Date(), changedBy, note })
  returnRequest.status = status
}

// Customer-initiated return request for a DELIVERED order.
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, reason, description, items } = req.body || {}

    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' })
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: 'Please provide a return reason' })
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, message: 'Select at least one item to return' })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    if (!POST_DELIVERY_STATES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Returns are only available after the order has been delivered' })
    }

    const existing = await ReturnRequest.findOne({
      orderId: order._id,
      userId: order.userId._id,
      status: { $nin: ['RETURN_REJECTED', 'REFUNDED', 'CANCELLED'] },
    })
    if (existing) return res.status(400).json({ success: false, message: 'A return request for this order is already in progress' })

    const orderItems = await OrderItem.find({ orderId: order._id })
    const byItemId = new Map(orderItems.map((oi: any) => [String(oi._id), oi]))
    const returnItems: { variantId: string; quantity: number; price: number }[] = []
    let returnedSubtotal = 0
    for (const it of items) {
      const orderItem = byItemId.get(String(it.itemId))
      if (!orderItem) {
        return res.status(400).json({ success: false, message: 'One or more selected items are not part of this order' })
      }
      const quantity = Math.max(1, Math.min(Math.trunc(Number(it.quantity) || 1), orderItem.quantity))
      returnItems.push({ variantId: orderItem.variantId, quantity, price: orderItem.price })
      returnedSubtotal += Number(orderItem.total) || 0
    }

    // Refund is proportional to the returned items' share of the order, so a
    // partial return never triggers a refund larger than what was paid.
    const orderItemsTotal = orderItems.reduce((s: number, oi: any) => s + (Number(oi.total) || 0), 0)
    const refundAmount =
      orderItemsTotal > 0 && order.total > 0
        ? Math.min(order.total, Math.round(order.total * (returnedSubtotal / orderItemsTotal)))
        : Math.round(order.total || 0)

    const returnRequest = await ReturnRequest.create({
      returnNumber: generateReturnNumber(),
      orderId: order._id,
      userId: order.userId._id,
      items: returnItems,
      reason: String(reason).trim(),
      description: description ? String(description).trim() : undefined,
      refundAmount,
      statusHistory: [{ status: 'RETURN_REQUESTED', changedAt: new Date(), changedBy: 'CUSTOMER', note: 'Return requested by customer' }],
    })

    if (order.status !== 'RETURN_REQUESTED') {
      pushOrderStatusHistorySafe(order, 'RETURN_REQUESTED', 'CUSTOMER', 'Return requested')
      await order.save()
    }

    await notify({
      userId: req.user!.id,
      type: 'ORDER',
      title: 'Return requested',
      message: `Return request ${returnRequest.returnNumber} submitted for order ${order.orderNumber}.`,
      metadata: { orderId: String(order._id), returnId: String(returnRequest._id), entity: 'return' },
    })
    await writeAudit({ adminId: req.user!.id, action: 'RETURN_REQUESTED', entity: 'ReturnRequest', entityId: String(returnRequest._id), newValue: serializeAuditValue({ returnNumber: returnRequest.returnNumber, orderId: String(order._id), reason }) })

    return res.status(201).json({ success: true, message: 'Return requested', data: returnRequest })
  } catch (error) {
    console.error('POST /returns error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

function pushOrderStatusHistorySafe(order: any, status: string, changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN', note?: string) {
  order.statusHistory = order.statusHistory || []
  order.statusHistory.push({ status, changedAt: new Date(), changedBy, note })
  order.status = status
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'
    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status

    const [returns, total] = await Promise.all([
      ReturnRequest.find(where).populate('orderId', 'orderNumber total paymentStatus paymentGateway').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ReturnRequest.countDocuments(where),
    ])
    return res.json({ success: true, data: returns, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    console.error('GET /returns error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id).populate('orderId')
    if (!returnRequest) return res.status(404).json({ success: false, message: 'Return request not found' })
    const ownerId = returnRequest.userId ? String((returnRequest.userId as any)._id || returnRequest.userId) : ''
    if (req.user!.role !== 'ADMIN' && ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    return res.json({ success: true, data: returnRequest })
  } catch (error) {
    console.error('GET /returns/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin drives the return lifecycle: review -> approve/reject -> receive -> refund.
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNote, trackingNumber, note } = req.body
    const returnRequest = await ReturnRequest.findById(req.params.id)
    if (!returnRequest) return res.status(404).json({ success: false, message: 'Return request not found' })

    const before = returnRequest.toObject()

    if (status !== undefined && status !== returnRequest.status) {
      if (!Object.keys(RETURN_REQUEST_TRANSITIONS).includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid return status: ${status}` })
      }
      try {
        assertTransition(returnRequest.status, status, RETURN_REQUEST_TRANSITIONS, 'return')
      } catch (error: any) {
        return res.status(error?.statusCode || 400).json({ success: false, message: error?.message || 'Invalid return status transition' })
      }

      const adminNoteText = adminNote || note || `Status updated to ${status}`
      pushReturnHistory(returnRequest, status, 'ADMIN', adminNoteText)

      const order = await Order.findById(returnRequest.orderId)
      const orderUserId = String((order as any)?.userId?._id || (order as any)?.userId || returnRequest.userId)

      if (status === 'RETURN_APPROVED') {
        if (order && (order.status === 'RETURN_REQUESTED' || order.status === 'ADMIN_REVIEW' || order.status === 'DELIVERED')) {
          try {
            assertTransition(order.status, 'RETURN_APPROVED', ORDER_TRANSITIONS, 'order')
            pushOrderStatusHistorySafe(order, 'RETURN_APPROVED', 'ADMIN', 'Return approved')
            await order.save()
          } catch { /* order status already reflects it */ }
        }
      }

      if (status === 'RETURN_REJECTED') {
        if (order && order.status === 'RETURN_REQUESTED') {
          try {
            assertTransition(order.status, 'DELIVERED', ORDER_TRANSITIONS, 'order')
            pushOrderStatusHistorySafe(order, 'DELIVERED', 'ADMIN', 'Return request declined; order resumed')
            await order.save()
          } catch { /* best-effort */ }
        }
      }

      if (status === 'RETURN_RECEIVED') {
        if (order && !(order as any).stockRestored) {
          await restoreStockAndCoupon(order).catch(() => {})
          order.statusHistory = order.statusHistory || []
          order.statusHistory.push({ status: order.status, changedAt: new Date(), changedBy: 'ADMIN', note: 'Returned items received — stock restored' })
          await order.save()
        }
      }

      if (status === 'REFUND_PENDING' && order) {
        order.statusHistory = order.statusHistory || []
        order.statusHistory.push({ status: order.status, changedAt: new Date(), changedBy: 'ADMIN', note: 'Refund pending for returned order' })
        order.paymentStatus = 'REFUND_PENDING' as any
        await order.save()
      }

      if (status === 'REFUNDED') {
        // Gateway refund is triggered by the admin through /orders/:id/refund
        // (an online-paid order). Here we record the linkage and complete the
        // return only after the order already shows the refund.
        if (order) {
          if (!(order as any).stockRestored) {
            await restoreStockAndCoupon(order).catch(() => {})
          }
          returnRequest.refundedAt = new Date()
          returnRequest.refundId = (order as any).razorpayRefundId || returnRequest.refundId
          order.paymentStatus = 'REFUNDED' as any
          order.statusHistory = order.statusHistory || []
          order.statusHistory.push({ status: order.status, changedAt: new Date(), changedBy: 'ADMIN', note: 'Return refunded' })
          await order.save()
        }
      }

      await returnRequest.save()

      await writeAudit({
        adminId: req.user!.id, action: `RETURN_${status}`, entity: 'ReturnRequest', entityId: String(returnRequest._id),
        oldValue: serializeAuditValue({ status: before.status }),
        newValue: serializeAuditValue({ status, refundAmount: returnRequest.refundAmount }),
        ipAddress: req.ip,
      })
      await notify({
        userId: orderUserId,
        type: status === 'REFUNDED' || status === 'REFUND_PENDING' ? 'REFUND' : 'ORDER',
        title: `Return ${status.split('_').join(' ').toLowerCase()}`,
        message: `Return ${returnRequest.returnNumber} for order ${(order as any)?.orderNumber || returnRequest.returnNumber} is now: ${status.split('_').join(' ').toLowerCase()}.`,
        metadata: { orderId: String(returnRequest.orderId), returnId: String(returnRequest._id), entity: 'return', status },
      })

      return res.json({ success: true, message: 'Return updated', data: returnRequest })
    }

    if (trackingNumber !== undefined && trackingNumber !== null) {
      returnRequest.trackingNumber = String(trackingNumber).trim()
    }
    if (adminNote !== undefined && adminNote !== null) returnRequest.adminNote = String(adminNote)
    await returnRequest.save()
    return res.json({ success: true, message: 'Return updated', data: returnRequest })
  } catch (error) {
    console.error('PUT /returns/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router