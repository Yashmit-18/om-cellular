import { Router, Response } from 'express'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { Order } from '../models/order.model'
import { env } from '../config/env'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'
import { notify } from '../services/notification.service'
import { restoreStockAndCoupon } from '../services/orderLifecycle.service'

const router = Router()

// Online (non-COD) payment methods accepted through the Razorpay checkout.
const ONLINE_METHODS = ['upi', 'netbanking', 'card', 'wallet', 'online']

function razorpayConfigured(): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
}

function getRazorpay() {
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  })
}

// Public endpoint: reports whether online payments are configured and, if so,
// exposes only the public key id needed to open the Checkout page.
router.get('/config', (_req, res) => {
  const enabled = razorpayConfigured()
  return res.json({ success: true, data: { enabled, keyId: enabled ? env.RAZORPAY_KEY_ID : '' } })
})

// Initialize a Razorpay payment order for an existing, user-owned order.
// The client is given only the public key_id + Razorpay order id; the secret
// never leaves the server. The order is NOT marked paid here.
router.post('/init', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!razorpayConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payments are not configured yet. Please use Cash on Delivery or contact the store.',
      })
    }

    const { orderId, method } = req.body
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' })
    if (!method || !ONLINE_METHODS.includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' })
    }

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already paid' })
    }
    if (order.paymentMethod === 'cod') {
      return res.status(400).json({ success: false, message: 'Cash on Delivery orders do not require online payment' })
    }

    // If we previously created a Razorpay order, reuse it so a refresh / retry
    // does not generate a brand new order each time.
    if (!order.razorpayOrderId) {
      const amountPaise = Math.round(order.total * 100)
      const rzrOrder = await getRazorpay().orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: String(order._id), orderNumber: order.orderNumber, userId: String(order.userId) },
      })
      order.razorpayOrderId = rzrOrder.id
      if (order.paymentStatus !== 'PENDING_PAYMENT') order.paymentStatus = 'PENDING_PAYMENT'
      await order.save()
    }

    return res.json({
      success: true,
      data: {
        orderId: String(order._id),
        keyId: env.RAZORPAY_KEY_ID,
        razorpayOrderId: order.razorpayOrderId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        method,
      },
    })
  } catch (error: any) {
    console.error('POST /payments/init error:', error?.message || error)
    return res.status(500).json({ success: false, message: 'Payment initialization failed' })
  }
})

// Verify a Razorpay payment signature server-side. The order is only marked
// PAID when the HMAC-SHA256 signature over (order_id|payment_id) matches using
// the server-side key secret. The client can never assert success on its own.
router.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!razorpayConfigured()) {
      return res.status(503).json({ success: false, message: 'Online payments are not configured yet' })
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Incomplete payment details' })
    }

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.userId.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    if (order.paymentStatus === 'PAID') {
      return res.json({ success: true, data: { orderId: String(order._id), status: 'PAID', alreadyPaid: true } })
    }
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Payment order mismatch' })
    }

    // Verify HMAC-SHA256 signature using the server-side key secret.
    const body = `${razorpayOrderId}|${razorpayPaymentId}`
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expected !== razorpaySignature) {
      console.error('Payment signature verification failed for order', order.orderNumber)
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'FAILED' }, { new: true })
      return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    // Double-check with Razorpay's server that the payment was captured.
    let amountMatches = true
    let paymentCaptured = true
    try {
      const payment = await getRazorpay().payments.fetch(razorpayPaymentId)
      const paidPaise = Number(payment.amount) || 0
      const expectedPaise = Math.round(order.total * 100)
      amountMatches = paidPaise === expectedPaise
      paymentCaptured = payment.status === 'captured'
    } catch (e: any) {
      console.error('Razorpay payment fetch failed:', e?.message || e)
      paymentCaptured = false
    }

    if (!paymentCaptured || !amountMatches) {
      return res.status(400).json({ success: false, message: 'Payment could not be confirmed' })
    }

    order.paymentStatus = 'PAID'
    order.razorpayPaymentId = razorpayPaymentId
    order.razorpaySignature = razorpaySignature
    order.paidAt = new Date()
    order.paymentGateway = 'razorpay'
    if (order.status === 'PENDING') {
      order.statusHistory = order.statusHistory || []
      order.statusHistory.push({
        status: 'PAYMENT_CONFIRMED',
        changedAt: new Date(),
        changedBy: 'SYSTEM',
        note: 'Payment received via Razorpay',
      })
      order.status = 'PAYMENT_CONFIRMED'
    }
    await order.save()

    return res.json({ success: true, data: { orderId: String(order._id), status: 'PAID' } })
  } catch (error: any) {
    console.error('POST /payments/verify error:', error?.message || error)
    return res.status(500).json({ success: false, message: 'Payment verification failed' })
  }
})

// Razorpay webhook. Public endpoint; authenticity is confirmed via the
// X-Razorpay-Signature header over the raw request body using the webhook secret.
router.post('/webhook', async (req: AuthRequest, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined
  const body = (req as any).rawBody || ''

  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ success: false, message: 'Webhook secret not configured' })
  }
  if (!signature) {
    return res.status(400).json({ success: false, message: 'Missing signature' })
  }

  // Verify webhook signature over the raw body.
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  if (expected !== signature) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
  }

  try {
    const event = JSON.parse(body)
    const entity = event?.payload?.payment?.entity

    if (event?.event === 'payment.captured' && entity) {
      const paymentId = entity.id
      const notes = entity.notes || {}
      const razorpayOrderId = entity.order_id

      if (!razorpayOrderId) return res.json({ success: true, received: true })

      const where: any = { razorpayOrderId, paymentStatus: { $ne: 'PAID' } }
      if (notes.orderNumber) where.orderNumber = notes.orderNumber

      const order = await Order.findOne(where)
      if (order) {
        order.paymentStatus = 'PAID'
        order.razorpayPaymentId = paymentId
        order.paidAt = new Date()
        order.paymentGateway = 'razorpay'
        if (order.status === 'PENDING') {
          order.statusHistory = order.statusHistory || []
          order.statusHistory.push({
            status: 'PAYMENT_CONFIRMED',
            changedAt: new Date(),
            changedBy: 'SYSTEM',
            note: 'Payment received via Razorpay (webhook)',
          })
          order.status = 'PAYMENT_CONFIRMED'
        }
        await order.save()
        await notify({
          userId: String(order.userId._id || order.userId),
          type: 'PAYMENT',
          title: 'Payment received',
          message: `Your payment for order ${order.orderNumber} was successful.`,
          metadata: { orderId: String(order._id), entity: 'order' },
        }).catch(() => {})
      }
    }

    if (event?.event === 'payment.failed' && entity) {
      const notes = entity.notes || {}
      const razorpayOrderId = entity.order_id

      if (!razorpayOrderId) return res.json({ success: true, received: true })

      const where: any = { razorpayOrderId, paymentStatus: { $nin: ['PAID', 'REFUNDED'] } }
      if (notes.orderNumber) where.orderNumber = notes.orderNumber

      const order = await Order.findOne(where)
      if (order) {
        const reason = entity.error_description || entity.error_code || 'Payment failed'
        order.paymentStatus = 'FAILED'
        if (order.status === 'PENDING' || order.status === 'PAYMENT_CONFIRMED') {
          order.statusHistory = order.statusHistory || []
          order.statusHistory.push({
            status: 'FAILED',
            changedAt: new Date(),
            changedBy: 'SYSTEM',
            note: `Payment failed: ${reason}`,
          })
          order.status = 'FAILED'
        }
        order.notes = [order.notes, `Payment failed: ${reason}`].filter(Boolean).join(' | ')
        await order.save()
        // This order will never be fulfilled — return the reserved stock and
        // coupon usage. Idempotent via the stockRestored flag.
        await restoreStockAndCoupon(order).catch(console.error)
        await notify({
          userId: String(order.userId._id || order.userId),
          type: 'PAYMENT',
          title: 'Payment failed',
          message: `The payment for order ${order.orderNumber} failed. Please try again or use Cash on Delivery.`,
          metadata: { orderId: String(order._id), entity: 'order' },
        }).catch(() => {})
      }
    }

    return res.json({ success: true, received: true })
  } catch (error: any) {
    console.error('Payment webhook error:', error?.message || error)
    return res.status(500).json({ success: false, message: 'Webhook processing failed' })
  }
})

export default router
