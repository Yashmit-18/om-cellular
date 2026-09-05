import { Router, Response } from 'express'
import { Order, OrderItem } from '../models/order.model'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { Coupon } from '../models/coupon.model'
import { Setting } from '../models/setting.model'
import { Address } from '../models/address.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateOrderNumber, paginate, normalizePhone } from '../utils/helpers'
import { checkServiceability } from '../services/serviceability.service'
import { ORDER_TRANSITIONS, assertTransition, PRE_CANCEL_STATES } from '../services/fsm.service'
import { writeAudit, serializeAuditValue } from '../services/audit.service'
import { notify } from '../services/notification.service'
import { restoreStockAndCoupon, syncInventory } from '../services/orderLifecycle.service'

const router = Router()

const ORDER_STATUSES = Object.keys(ORDER_TRANSITIONS)
const PAYMENT_STATUSES = ['PENDING', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED']

function pushOrderStatusHistory(order: any, status: string, changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN', note?: string) {
  order.statusHistory = order.statusHistory || []
  order.statusHistory.push({ status, changedAt: new Date(), changedBy, note })
  order.status = status
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Decrements stock atomically at order creation; returns false when the
// guarded update was rejected (inactive or insufficient stock). Rejects
// overselling races because the $inc only matches when stock >= quantity.
async function decrementStock(variant: any, quantity: number): Promise<boolean> {
  const updated = await ProductVariant.findOneAndUpdate(
    { _id: variant._id, isActive: true, stock: { $gte: quantity } },
    { $inc: { stock: -quantity, soldCount: quantity } }
  )
  if (!updated) return false
  await syncInventory(variant._id, -quantity, { reason: 'ORDER_PLACED', referenceType: 'order' }).catch(() => {})
  return true
}

async function loadActiveVariant(variantId: any) {
  return ProductVariant.findOne({ _id: variantId, isActive: true })
}

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const items = await OrderItem.find({ orderId: order._id }).populate('variantId')
    // Public tracking surface: expose only what a courier/ordering customer
    // needs. No shipping address, no payment/gateway references, no PII.
    const data = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      couponCode: order.couponCode || undefined,
      trackingNumber: order.trackingNumber || undefined,
      items: items.map(it => {
        const variant: any = it.variantId
        return {
          id: String(it._id),
          variantId: String(it.variantId._id || it.variantId),
          name: variant?.name || 'Item',
          image: variant?.images?.[0] || variant?.primaryImage || undefined,
          quantity: it.quantity,
          price: it.price,
        }
      }),
    }
    return res.json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search, startDate, endDate } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'

    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status
    if (search) where.$or = [{ orderNumber: { $regex: search, $options: 'i' } }]
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.$gte = new Date(startDate as string)
      if (endDate) where.createdAt.$lte = new Date(endDate as string)
    }

    const [orders, total] = await Promise.all([
      Order.find(where).populate('userId', 'name email phone').populate('address').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Order.countDocuments(where),
    ])

    const ordersWithItems = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.find({ orderId: o._id }).populate('variantId')
      return { ...o.toObject(), items }
    }))

    return res.json({ success: true, data: ordersWithItems, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    console.error('GET /orders error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email phone').populate('address')
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (req.user!.role !== 'ADMIN' && order.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const items = await OrderItem.find({ orderId: order._id }).populate('variantId')
    return res.json({ success: true, data: { ...order.toObject(), items } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { items, addressId, address, couponCode, paymentMethod, notes, upiReferenceId } = req.body
    const userId = req.user!.id

    if (!items || !items.length) return res.status(400).json({ success: false, message: 'Items are required' })
    if (paymentMethod && !['cod', 'online', 'upi', 'netbanking', 'card', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' })
    }

    let subtotal = 0
    const orderItems: any[] = []
    const decremented: { variant: any; quantity: number }[] = []

    for (const item of items) {
      const variant = await loadActiveVariant(item.variantId)
      if (!variant) return res.status(400).json({ success: false, message: 'Product variant not available' })

      const product = await Product.findById(variant.productId)
      if (!product || !product.isActive) return res.status(400).json({ success: false, message: 'Product is not available' })

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1)
      if (quantity > 10) return res.status(400).json({ success: false, message: 'A maximum of 10 units per item is allowed' })

      const price = variant.discountPrice || variant.price
      if (price == null || price < 0) return res.status(400).json({ success: false, message: 'Pricing data unavailable for this item' })

      const ok = await decrementStock(variant, quantity)
      if (!ok) {
        // Roll back any stock already decremented earlier in this request.
        for (const d of decremented) {
          await ProductVariant.findByIdAndUpdate(d.variant._id, { $inc: { stock: +d.quantity, soldCount: -d.quantity } }).catch(() => {})
          await syncInventory(d.variant._id, +d.quantity, { reason: 'ORDER_CANCELLED', referenceType: 'checkout-rollback' }).catch(() => {})
        }
        return res.status(400).json({ success: false, message: `Insufficient stock for ${variant.name}` })
      }
      decremented.push({ variant, quantity })

      const itemTotal = price * quantity
      orderItems.push({
        variantId: variant._id, quantity, price: variant.price,
        discount: variant.discountPrice ? (variant.price - variant.discountPrice) * quantity : 0,
        total: itemTotal,
      })
      subtotal += itemTotal
    }

    const settings = await Setting.find({ key: { $in: ['tax_rate', 'free_shipping_threshold', 'standard_shipping_price'] } })
    const settingsMap: Record<string, string> = {}
    for (const s of settings) settingsMap[s.key] = s.value || ''

    const taxRate = parseFloat(settingsMap.tax_rate || '0.18') || 0.18
    const freeShippingThreshold = parseInt(settingsMap.free_shipping_threshold || '999') || 999
    const standardShippingPrice = parseInt(settingsMap.standard_shipping_price || '99') || 99

    const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingPrice
    const tax = Math.round(subtotal * taxRate * 100) / 100

    let resolvedAddress = null
    if (addressId) {
      resolvedAddress = await Address.findById(addressId)
      if (!resolvedAddress) return res.status(400).json({ success: false, message: 'Address not found' })
      if (resolvedAddress.userId.toString() !== userId) {
        return res.status(400).json({ success: false, message: 'Invalid delivery address' })
      }
    } else if (address?.addressLine1 && address?.city && address?.state && address?.pincode) {
      if (!address.name || !String(address.phone || '').trim()) {
        return res.status(400).json({ success: false, message: 'Recipient name and phone are required' })
      }
      if (!/^\d{6}$/.test(String(address.pincode).trim())) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code' })
      }
      const normalizedPhone = normalizePhone(String(address.phone || ''))
      if (!normalizedPhone) {
        return res.status(400).json({ success: false, message: 'Phone must be a valid 10-digit Indian phone number' })
      }
      const savedAddress = await Address.create({
        userId,
        name: String(address.name).trim(),
        phone: normalizedPhone,
        alternatePhone: address.alternatePhone ? normalizePhone(String(address.alternatePhone).trim()) || undefined : undefined,
        landmark: address.landmark ? String(address.landmark).trim() : undefined,
        addressLine1: String(address.addressLine1).trim(),
        addressLine2: address.addressLine2 ? String(address.addressLine2).trim() : undefined,
        city: String(address.city).trim(),
        state: String(address.state).trim(),
        pincode: String(address.pincode).trim(),
        country: address.country || 'IN', isDefault: false,
      })
      resolvedAddress = savedAddress
    }

    if (!resolvedAddress) {
      return res.status(400).json({ success: false, message: 'A valid delivery address is required' })
    }

    // Serviceability gate: enforced whenever configured areas exist.
    const serviceability = await checkServiceability(resolvedAddress.pincode, 'delivery')
    if (serviceability.configured && !serviceability.serviceable) {
      return res.status(400).json({
        success: false,
        message: `We do not currently deliver to PIN code ${resolvedAddress.pincode}. Please check back soon — you can request a notification when delivery becomes available.`,
        serviceability: { ...serviceability, service: 'delivery' },
      })
    }

    const shippingAddress = {
      name: resolvedAddress.name,
      phone: resolvedAddress.phone,
      alternatePhone: resolvedAddress.alternatePhone || '',
      landmark: resolvedAddress.landmark || '',
      addressLine1: resolvedAddress.addressLine1,
      addressLine2: resolvedAddress.addressLine2 || '',
      city: resolvedAddress.city,
      state: resolvedAddress.state,
      pincode: resolvedAddress.pincode,
      country: resolvedAddress.country || 'IN',
    }

    let couponDiscount = 0
    let couponId: any = null
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() })
      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()
        const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const meetsMinimum = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount

        let perUserOk = true
        if (coupon.maxPerUser && coupon.maxPerUser > 0) {
          const usedByUser = await Order.countDocuments({ userId, couponId: coupon._id, status: { $nin: ['CANCELLED', 'FAILED', 'REFUNDED'] } })
          perUserOk = usedByUser < coupon.maxPerUser
        }

        if (notExpired && withinLimit && meetsMinimum && perUserOk) {
          const { applyCouponDiscount } = await import('../services/coupon.service')
          couponDiscount = applyCouponDiscount(coupon as any, subtotal)
          couponId = coupon._id
        }
      }
    }

    // Atomically consume a usage-limited coupon.
    if (couponId) {
      const coupon = await Coupon.findById(couponId)
      if (coupon && coupon.usageLimit) {
        const claimed = await Coupon.findOneAndUpdate(
          { _id: couponId, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
          { $inc: { usedCount: 1 } }
        )
        if (!claimed) {
          couponId = null
          couponDiscount = 0
        }
      } else if (coupon) {
        await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } })
      }
    }

    const total = Math.max(0, subtotal + shipping + tax - couponDiscount)
    const orderNumber = generateOrderNumber()
    const isCod = paymentMethod === 'cod' || !paymentMethod
    const paymentStatus = isCod ? 'PENDING' : 'PENDING_PAYMENT'
    const initialStatus = 'PENDING'

    const order = await Order.create({
      orderNumber, userId, addressId: resolvedAddress!.id, subtotal,
      discount: 0, shipping, tax, total,
      couponId: couponId || null,
      couponCode: couponId ? String(req.body.couponCode || '').toUpperCase() : undefined,
      couponDiscount, paymentMethod: paymentMethod || 'cod',
      paymentGateway: isCod ? 'cod' : undefined,
      paymentStatus, shippingAddress,
      statusHistory: [{
        status: initialStatus,
        changedAt: new Date(),
        changedBy: 'SYSTEM',
        note: isCod ? 'Order placed with Cash on Delivery' : 'Order placed, payment pending',
      }],
      upiReferenceId: paymentMethod && paymentMethod !== 'cod' && upiReferenceId ? String(upiReferenceId).trim() : undefined,
      notes,
      stockRestored: false,
      couponRestored: false,
    })

    for (const item of orderItems) {
      await OrderItem.create({ orderId: order._id, ...item })
    }

    const result = await Order.findById(order._id).populate('userId', 'name email')
    const resultItems = await OrderItem.find({ orderId: order._id }).populate('variantId')

    await notify({
      userId: String(userId),
      type: 'ORDER',
      title: 'Order placed',
      message: `Your order ${orderNumber} has been placed for ${formatAmount(total)}.`,
      metadata: { orderId: String(order._id), status: initialStatus, entity: 'order' },
    })

    return res.status(201).json({ success: true, message: 'Order created', data: { ...result!.toObject(), items: resultItems } })
  } catch (error) {
    console.error('POST /orders error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Customer-initiated cancellation request. Only allowed before fulfilment
// starts (up to READY_TO_SHIP). Conversion to CANCELLED happens on admin action.
router.post('/:id/cancel-request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (req.user!.role !== 'ADMIN' && order.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    if (!PRE_CANCEL_STATES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'This order cannot be cancelled. Cancellation is only available before the order ships.' })
    }
    if (order.status === 'CANCEL_REQUESTED') {
      return res.status(400).json({ success: false, message: 'A cancellation request is already pending' })
    }

    pushOrderStatusHistory(order, 'CANCEL_REQUESTED', 'CUSTOMER', 'Customer requested cancellation')
    await order.save()

    await notify({
      userId: String(order.userId._id || order.userId),
      type: 'CANCELLATION',
      title: 'Cancellation requested',
      message: `A cancellation request has been submitted for order ${order.orderNumber}.`,
      metadata: { orderId: String(order._id), entity: 'order' },
    })
    await writeAudit({ action: 'ORDER_CANCEL_REQUEST', entity: 'Order', entityId: String(order._id), newValue: 'CANCEL_REQUESTED' })

    return res.json({ success: true, message: 'Cancellation requested. Our team will review it shortly.', data: order })
  } catch (error) {
    console.error('POST cancel-request error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentStatus, trackingNumber, note, notes, paymentGateway } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const before = order.toObject()

    let changed = false

    if (status !== undefined && status !== order.status) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid order status: ${status}` })
      }
      try {
        assertTransition(order.status, status, ORDER_TRANSITIONS, 'order')
      } catch (error: any) {
        return res.status(error?.statusCode || 400).json({ success: false, message: error?.message || 'Invalid status transition' })
      }

      if (status === 'CANCELLED') {
        const restored = await restoreStockAndCoupon(order)
        pushOrderStatusHistory(order, 'CANCELLED', 'ADMIN', note || 'Order cancelled by admin')
        if (order.paymentStatus === 'PAID') {
          order.paymentStatus = 'REFUND_PENDING'
          order.statusHistory.push({ status: order.status, changedAt: new Date(), changedBy: 'ADMIN', note: 'Refund pending — triggered after cancellation' })
        }
        changed = true
        await order.save()
        await writeAudit({
          adminId: req.user!.id, action: 'ORDER_CANCELLED', entity: 'Order', entityId: String(order._id),
          oldValue: serializeAuditValue({ status: before.status, paymentStatus: before.paymentStatus }),
          newValue: serializeAuditValue({ status: 'CANCELLED', stockRestored: restored }),
          ipAddress: req.ip,
        })
        await notify({
          userId: String(order.userId._id || order.userId),
          type: 'CANCELLATION',
          title: 'Order cancelled',
          message: `Order ${order.orderNumber} was cancelled${order.paymentStatus === 'REFUND_PENDING' ? ' and a refund is being processed' : ''}.`,
          metadata: { orderId: String(order._id), entity: 'order' },
        })
        return res.json({ success: true, message: 'Order cancelled. Stock and coupon usage restored.', data: order })
      }

      if (order.status === 'CANCEL_REQUESTED' && status !== 'CANCELLED') {
        pushOrderStatusHistory(order, status, 'ADMIN', note || 'Cancellation request declined; order resumed')
      } else {
        pushOrderStatusHistory(order, status, 'ADMIN', note || `Status updated to ${status}`)
      }

      if (status === 'DELIVERED') {
        const { issueWarrantyForOrder } = await import('../services/warranty.service')
        await issueWarrantyForOrder(order).catch((error) => console.error('Warranty issuance failed:', error?.message || error))
      }
      changed = true
    }

    if (paymentStatus !== undefined && paymentStatus !== order.paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ success: false, message: `Invalid payment status: ${paymentStatus}` })
      }
      if (paymentStatus === 'REFUNDED' && order.paymentGateway === 'razorpay' && !order.razorpayRefundId) {
        return res.status(400).json({ success: false, message: 'Use the Refund action to mark an online order as refunded' })
      }
      if (paymentStatus === 'PAID') {
        order.paidAt = new Date()
        if (!order.paymentGateway || order.paymentGateway === 'cod') order.paymentGateway = 'manual'
      }
      if (paymentStatus === 'FAILED' && order.paymentMethod !== 'cod' && order.status === 'PENDING') {
        order.statusHistory = order.statusHistory || []
        order.statusHistory.push({ status: 'FAILED', changedAt: new Date(), changedBy: 'ADMIN', note: note || 'Payment failed' })
        order.status = 'FAILED'
      }
      order.statusHistory = order.statusHistory || []
      order.statusHistory.push({ status: order.status, changedAt: new Date(), changedBy: 'ADMIN', note: note || `Payment marked as ${paymentStatus}` })
      order.paymentStatus = paymentStatus
      changed = true
    }

    if (trackingNumber !== undefined && trackingNumber !== order.trackingNumber) {
      if (trackingNumber && (order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'PENDING')) {
        order.trackingNumber = trackingNumber
        if (order.statusHistory.every((h: any) => h.status !== 'SHIPPED')) {
          pushOrderStatusHistory(order, 'SHIPPED', 'ADMIN', 'Shipped — tracking number added')
        }
      } else {
        order.trackingNumber = trackingNumber
      }
      changed = true
    }
    if (notes !== undefined && notes !== null) { order.notes = notes; changed = true }
    if (paymentGateway !== undefined && paymentGateway !== null) {
      if (!['razorpay', 'cod', 'manual'].includes(paymentGateway)) {
        return res.status(400).json({ success: false, message: 'Invalid payment gateway' })
      }
      order.paymentGateway = paymentGateway
      changed = true
    }

    if (!changed) {
      return res.status(400).json({ success: false, message: 'No changes provided' })
    }

    await order.save()

    if (status !== undefined) {
      try {
        await writeAudit({
          adminId: req.user!.id, action: 'ORDER_STATUS_CHANGE', entity: 'Order', entityId: String(order._id),
          oldValue: before.status, newValue: status, ipAddress: req.ip,
        })
        await notify({
          userId: String(order.userId._id || order.userId),
          type: status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY' ? 'SHIPMENT' : 'ORDER',
          title: 'Order status updated',
          message: `Your order ${order.orderNumber} is now: ${status.split('_').join(' ').toLowerCase()}.`,
          metadata: { orderId: String(order._id), entity: 'order', status },
        })
      } catch (error) {
        console.error('Post-status audit/notify error:', error)
      }
    }

    return res.json({ success: true, message: 'Order updated', data: order })
  } catch (error) {
    console.error('PUT /orders error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin-triggered refund for an online-paid order. Idempotent: a refunded
// order can never be refunded twice. Uses the Razorpay server-side secret.
router.post('/:id/refund', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (order.paymentStatus === 'REFUNDED') {
      return res.status(400).json({ success: false, message: 'This order has already been refunded' })
    }
    if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUND_PENDING') {
      return res.status(400).json({ success: false, message: 'Only paid orders can be refunded' })
    }
    if (order.paymentGateway === 'cod' || order.paymentGateway === 'manual' || !order.razorpayPaymentId) {
      return res.status(400).json({ success: false, message: 'This order was not paid through an online gateway and needs a manual refund' })
    }

    const env = (await import('../config/env')).env
    if (!env.RAZORPAY_CONFIGURED) {
      return res.status(503).json({
        success: false,
        message: 'Refund cannot be processed yet: Razorpay is not configured. The order is marked REFUND_PENDING and stock was restored.',
      })
    }

    const Razorpay = (await import('razorpay')).default
    const gateway = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })

    const refundAmount = Math.round((order.refundAmount ?? order.total) * 100)
    const refund = await (gateway.refunds as any).create({
      payment_id: order.razorpayPaymentId,
      amount: refundAmount,
      notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    })

    order.razorpayRefundId = refund.id
    order.refundAmount = order.refundAmount ?? order.total
    order.refundedAt = new Date()
    order.paymentStatus = 'REFUNDED'
    if (order.status !== 'CANCELLED' && order.status !== 'RETURNED') {
      if (order.status === 'REFUND_PENDING') pushOrderStatusHistory(order, 'REFUNDED', 'ADMIN', 'Refund processed')
      else pushOrderStatusHistory(order, 'REFUNDED', 'ADMIN', 'Order refunded')
    }
    await order.save()

    await writeAudit({
      adminId: req.user!.id, action: 'ORDER_REFUND', entity: 'Order', entityId: String(order._id),
      oldValue: serializeAuditValue({ paymentStatus: 'PAID' }),
      newValue: serializeAuditValue({ paymentStatus: 'REFUNDED', refundId: refund.id, amount: order.refundAmount }),
      ipAddress: req.ip,
    })
    await notify({
      userId: String(order.userId._id || order.userId),
      type: 'REFUND',
      title: 'Refund processed',
      message: `A refund of ${formatAmount(order.refundAmount)} for order ${order.orderNumber} has been initiated.`,
      metadata: { orderId: String(order._id), refundId: refund.id, entity: 'order' },
    })

    return res.json({ success: true, message: 'Refund initiated', data: order })
  } catch (error: any) {
    console.error('POST /orders/:id/refund error:', error?.message || error)
    return res.status(500).json({ success: false, message: 'Refund could not be processed. Please try again or refund manually.' })
  }
})

// Printable invoice — accessible to the customer and admin for their orders.
router.get('/:id/invoice', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email phone')
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (req.user!.role !== 'ADMIN' && order.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const items = await OrderItem.find({ orderId: order._id }).populate('variantId')
    const address = order.shippingAddress || {}
    const itemRows = items.map((item: any) => {
      const variantName = item.variant?.name || item.variantId?.name || item.variantId || 'Item'
      return `<tr>
        <td>${escapeHtml(variantName)}</td>
        <td style="text-align:center">${escapeHtml(item.quantity)}</td>
        <td style="text-align:right">${formatAmount(item.price)}</td>
        <td style="text-align:right">${formatAmount(item.discount)}</td>
        <td style="text-align:right">${formatAmount(item.total)}</td>
      </tr>`
    }).join('')

    const invoiceNumber = `INV-${order.orderNumber}`
    const paymentLabel = order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentGateway === 'razorpay' ? `Online (${order.paymentMethod})` : order.paymentMethod || 'N/A'

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Invoice ${escapeHtml(order.orderNumber)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;color:#1f2937;margin:0;padding:32px}
.wrap{max-width:760px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
.head{background:#4f46e5;color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}
.head h1{margin:0;font-size:18px}.head p{margin:2px 0;font-size:12px;opacity:.9}
.meta{display:flex;justify-content:space-between;padding:24px 32px;border-bottom:1px solid #e5e7eb}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;background:#f9fafb;padding:10px 12px;border-bottom:1px solid #e5e7eb}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
.total{padding:16px 32px;background:#f9fafb}
.trow{display:flex;justify-content:space-between;font-size:13px;padding:2px 0}
.trow.grand{font-weight:700;font-size:15px;padding-top:8px;border-top:1px solid #e5e7eb}
.foot{padding:20px 32px;font-size:11px;color:#6b7280}
@media print{body{padding:0}.wrap{border:none;border-radius:0}}
</style></head>
<body>
<div class="wrap">
  <div class="head">
    <div><h1>OM CELLULAR</h1><p>Premium used &amp; refurbished phones</p></div>
    <div style="text-align:right"><h1 style="text-transform:uppercase">Invoice</h1><p>${escapeHtml(invoiceNumber)}</p></div>
  </div>
  <div class="meta">
    <div><strong>Bill To</strong><br/>${escapeHtml(address.name || '')}<br/>${escapeHtml(address.phone || '')}<br/>${escapeHtml([address.addressLine1, address.addressLine2, address.city, address.state, address.pincode].filter(Boolean).join(', '))}</div>
    <div style="text-align:right"><strong>Order</strong><br/>${escapeHtml(order.orderNumber)}<br/>${escapeHtml(new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }))}<br/>Payment: ${escapeHtml(paymentLabel)} (${escapeHtml(order.paymentStatus)})</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="total">
    <div class="trow"><span>Subtotal</span><span>${formatAmount(order.subtotal)}</span></div>
    <div class="trow"><span>Shipping</span><span>${formatAmount(order.shipping)}</span></div>
    <div class="trow"><span>Tax</span><span>${formatAmount(order.tax)}</span></div>
    ${order.couponDiscount > 0 ? `<div class="trow"><span>Coupon (${escapeHtml(order.couponCode || '')})</span><span>-${formatAmount(order.couponDiscount)}</span></div>` : ''}
    <div class="trow grand"><span>Total</span><span>${formatAmount(order.total)}</span></div>
  </div>
  <div class="foot">
    This is a system-generated invoice for ${escapeHtml(order.orderNumber)}. For support contact the store via the WhatsApp button on omcellular.<br/>
    Thank you for shopping with OM Cellular.
  </div>
</div>
</body>
</html>`

    return res.type('html').send(html)
  } catch (error) {
    console.error('GET /orders/:id/invoice error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount || 0)
}

export default router