import { Router, Response } from 'express'
import mongoose from 'mongoose'
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
import { couponApplicabilityError } from '../services/coupon.service'
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

// Releases a single stock claim (reverse of decrementStock). Rollback failures
// are logged loudly rather than swallowed silently.
async function restoreSingleStockClaim(variantId: any, quantity: number, referenceType = 'checkout-rollback'): Promise<void> {
  try {
    await ProductVariant.findByIdAndUpdate(variantId, { $inc: { stock: +quantity, soldCount: -quantity } })
    await syncInventory(variantId, +quantity, { reason: 'ORDER_CANCELLED', referenceType }).catch(() => {})
  } catch (error) {
    console.error('Checkout stock rollback failed:', error instanceof Error ? error.message : error)
  }
}

async function rollbackStockClaims(claims: { variant: any; quantity: number }[], referenceType = 'checkout-rollback') {
  for (const claim of claims) {
    await restoreSingleStockClaim(claim.variant._id, claim.quantity, referenceType)
  }
}

// Reverses an earlier coupon usage-count claim. Failures are logged, never swallowed.
async function releaseCouponCount(couponId: any) {
  await Coupon.findOneAndUpdate({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }).catch((error) => {
    console.error('Checkout coupon count release failed:', error?.message || error)
  })
}

// The duplicate-order guard looks back this far. It is a heuristic against
// double submits, NOT a uniqueness constraint: the same customer may legitimately
// buy an identical cart again after this window, which is why `dedupeKey` must
// never be given a unique database index.
const DUPLICATE_GUARD_WINDOW_MS = 5000

// Single source of truth for the order fingerprint. Previously the guard and the
// persisted field each built this string from their own duplicated template
// literal, so a future edit to one side would silently break deduplication.
function buildDedupeKey(userId: string, orderItems: { variantId: any; quantity: number }[], total: number): string {
  const variantFingerprint = orderItems.map((o: any) => `${o.variantId}:${o.quantity}`).sort().join('|')
  return `${userId}|${variantFingerprint}|${Math.round(total * 100)}`
}

async function findRecentDuplicateOrder(userId: string, dedupeKey: string): Promise<any | null> {
  return Order.findOne({ userId, dedupeKey, createdAt: { $gte: new Date(Date.now() - DUPLICATE_GUARD_WINDOW_MS) } })
}

// Deterministic compensation for the non-atomic Order -> OrderItem write pair.
//
// Order.create and the OrderItem inserts are separate writes, and no MongoDB
// transaction is used, so a failure between them would otherwise strand a
// PENDING order with zero items: an order that looks valid to every reader but
// can never be fulfilled, paid, or swept.
//
// This is deliberately topology-independent. It needs no replica set and no
// session, so it behaves identically on a standalone mongod and on a replica
// set, and it does not depend on unverified production topology. Deleting is
// safe because the order was never acknowledged to the client: this only runs
// while the request is still failing, and nothing is sent to the customer
// before every item is persisted.
async function discardUnacknowledgedOrder(orderId: any): Promise<void> {
  try {
    await OrderItem.deleteMany({ orderId })
    await Order.deleteOne({ _id: orderId })
  } catch (error) {
    // Never mask the original checkout failure, but make any leak loud: an order
    // stranded here is a real orphan that needs manual cleanup.
    console.error('Checkout order compensation failed:', error instanceof Error ? error.message : error)
  }
}

interface StockClaimEngine {
  decrement: (variant: any, quantity: number) => Promise<boolean>
  rollback: (variantId: any, quantity: number) => Promise<void>
}

// The checkout mutation phase: guarded decrements staged strictly after every
// deterministic validation, with reverse-order rollback of earlier claims when
// a later guarded decrement loses the stock race. Exported for DB-free tests.
export async function applyStagedStockClaims(
  items: { variant: any; quantity: number }[],
  engine: StockClaimEngine,
): Promise<{ ok: true; claims: { variant: any; quantity: number }[] } | { ok: false; reason: string }> {
  const claims: { variant: any; quantity: number }[] = []
  for (const item of items) {
    if (!(await engine.decrement(item.variant, item.quantity))) {
      for (const claim of claims.slice().reverse()) {
        await engine.rollback(claim.variant._id, claim.quantity)
      }
      return { ok: false, reason: `Insufficient stock for ${item.variant.name}` }
    }
    claims.push({ variant: item.variant, quantity: item.quantity })
  }
  return { ok: true, claims }
}

async function loadActiveVariant(variantId: any) {
  // A missing/garbage variantId previously resolved to the first active
  // variant (findOne with an undefined filter), silently charging the wrong
  // product. Treat it as not-found so the caller returns a 400.
  if (!variantId || typeof variantId !== 'string' || !mongoose.Types.ObjectId.isValid(variantId)) return null
  return ProductVariant.findOne({ _id: variantId, isActive: true })
}

// A coupon restricted to specific products/categories only applies when the
// cart contains a matching item. 'ALL' applies to everything.
async function couponTargetsMatch(coupon: any, orderItems: { variantId: any }[]): Promise<boolean> {
  if (!coupon || coupon.applicableTo === 'ALL' || !coupon.applicableTo) return true
  if (coupon.applicableTo === 'PRODUCTS') {
    if (!Array.isArray(coupon.applicableProductIds) || coupon.applicableProductIds.length === 0) return false
    const variants = await ProductVariant.find({ _id: { $in: orderItems.map((i) => i.variantId) } })
    const productIds = new Set(variants.map((v: any) => String(v.productId)))
    return coupon.applicableProductIds.some((id: any) => productIds.has(String(id)))
  }
  if (coupon.applicableTo === 'CATEGORIES') {
    if (!Array.isArray(coupon.applicableCategoryIds) || coupon.applicableCategoryIds.length === 0) return false
    const variants = await ProductVariant.find({ _id: { $in: orderItems.map((i) => i.variantId) } })
    const products = await Product.find({ _id: { $in: variants.map((v: any) => v.productId) } })
    const categoryIds = new Set(products.map((p: any) => String(p.categoryId)))
    return coupon.applicableCategoryIds.some((id: any) => categoryIds.has(String(id)))
  }
  return false
}

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const phone = normalizePhone(String(req.query.phone || ''))
    if (!phone) return res.status(400).json({ success: false, message: 'Order number and phone number are required for tracking' })
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (normalizePhone(String(order.shippingAddress?.phone || '')) !== phone) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

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
      statusHistory: (order.statusHistory || []).map((entry: any) => ({ status: entry.status, changedAt: entry.changedAt })),
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

    // PASS 1 — pure validation only. No mutation happens in this pass, so a
    // deterministically-rejected request can never leak a stock decrement.
    let subtotal = 0
    const orderItems: any[] = []

    for (const item of items) {
      const variant = await loadActiveVariant(item.variantId)
      if (!variant) return res.status(400).json({ success: false, message: 'Product variant not available' })

      const product = await Product.findById(variant.productId)
      if (!product || !product.isActive) return res.status(400).json({ success: false, message: 'Product is not available' })

      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1)
      if (quantity > 10) return res.status(400).json({ success: false, message: 'A maximum of 10 units per item is allowed' })

      const price = variant.discountPrice || variant.price
      if (price == null || price < 0) return res.status(400).json({ success: false, message: 'Pricing data unavailable for this item' })

      const itemTotal = price * quantity
      orderItems.push({
        variantId: variant._id, quantity, price: variant.price,
        discount: variant.discountPrice ? (variant.price - variant.discountPrice) * quantity : 0,
        total: itemTotal,
        variant,
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

    // Coupon contract (established from the rest of the system, see below):
    // a coupon code that is supplied but not valid for THIS cart is rejected
    // with the same reason the public validate endpoint returns. It is never
    // silently dropped.
    //
    // Evidence for that contract, which this previously contradicted:
    //  - GET /coupons/validate/:code already answers 404/400 with a specific
    //    reason for unknown, inactive, expired, exhausted, below-minimum,
    //    wrong-target and over-per-user coupons.
    //  - The storefront only sends `couponCode` when that endpoint succeeded
    //    (client CheckoutPage: `couponCode: appliedCoupon?.code || undefined`),
    //    so a valid code here is the norm and an invalid one is a stale or
    //    tampered request.
    //  - The project documents coupons as "server-validated".
    // Silently proceeding instead created the real defect: the customer was
    // shown a discounted total at checkout and the order was created at the
    // full, higher total with no discount and no error.
    let couponDiscount = 0
    let couponId: any = null
    if (couponCode) {
      const normalizedCode = String(couponCode).toUpperCase()
      const coupon = await Coupon.findOne({ code: normalizedCode })

      const rejectCoupon = (message: string) => res.status(400).json({ success: false, message })

      if (!coupon || !coupon.isActive) return rejectCoupon('Invalid coupon code')
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return rejectCoupon('Coupon has expired')
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return rejectCoupon('Coupon usage limit reached')

      const applicabilityError = couponApplicabilityError(coupon as any, subtotal)
      if (applicabilityError) return rejectCoupon(applicabilityError)

      if (coupon.applicableTo === 'PRODUCTS' || coupon.applicableTo === 'CATEGORIES') {
        if (!(await couponTargetsMatch(coupon as any, orderItems))) {
          return rejectCoupon('This coupon does not apply to the items in your cart')
        }
      }

      if (coupon.maxPerUser && coupon.maxPerUser > 0) {
        const usedByUser = await Order.countDocuments({ userId, couponCode: normalizedCode, status: { $ne: 'CANCELLED' } })
        if (usedByUser >= coupon.maxPerUser) {
          return rejectCoupon('You have already used this coupon the maximum number of times')
        }
      }

      const { applyCouponDiscount } = await import('../services/coupon.service')
      couponDiscount = applyCouponDiscount(coupon as any, subtotal)
      couponId = coupon._id
    }

    const total = Math.max(0, subtotal + shipping + tax - couponDiscount)
    const orderNumber = generateOrderNumber()
    const isCod = paymentMethod === 'cod' || !paymentMethod
    const paymentStatus = isCod ? 'PENDING' : 'PENDING_PAYMENT'
    const initialStatus = 'PENDING'
    const dedupeKey = userId ? buildDedupeKey(String(userId), orderItems, total) : undefined

    // Short-window duplicate guard: the same user submitting the identical
    // cart within a few seconds of their last order is almost certainly a
    // double submit / retry. Reject instead of creating a second (or, for COD, a
    // second unpaid order the user must later cancel). This first check runs
    // BEFORE any stock or coupon mutation, so a duplicate rejection needs no
    // rollback.
    if (dedupeKey && await findRecentDuplicateOrder(String(userId), dedupeKey)) {
      return res.status(409).json({ success: false, message: 'This looks like a duplicate order. Please check your recent orders before trying again.' })
    }

    // PASS 2 — mutations, staged strictly after every deterministic validation.
    // The only failures that can still occur here are non-deterministic races
    // (coupon/stock contention) or infrastructure errors; each is rolled back.
    let couponCountClaimed = false
    let stagedClaims: { variant: any; quantity: number }[] = []
    let createdOrderId: any = null
    const claimEngine: StockClaimEngine = { decrement: decrementStock, rollback: restoreSingleStockClaim }
    try {
      // 2a. Atomically consume a usage-limited coupon. Losing this race means
      // the coupon is no longer available, which under the established coupon
      // contract is a rejection, not a silent downgrade to full price.
      if (couponId) {
        const coupon = await Coupon.findById(couponId)
        if (coupon && coupon.usageLimit) {
          const claimed = await Coupon.findOneAndUpdate(
            { _id: couponId, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
            { $inc: { usedCount: 1 } }
          )
          if (!claimed) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' })
          }
          couponCountClaimed = true
        } else if (coupon) {
          await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } })
          couponCountClaimed = true
        }
      }

      // 2b. Guarded stock decrements. A losing race rolls back the claims that
      // were already staged by this request (never a peek at other requests).
      const claimResult = await applyStagedStockClaims(
        orderItems.map((o: any) => ({ variant: o.variant, quantity: o.quantity })),
        claimEngine,
      )
      if (!claimResult.ok) {
        if (couponCountClaimed && couponId) await releaseCouponCount(couponId)
        return res.status(400).json({ success: false, message: claimResult.reason })
      }
      stagedClaims = claimResult.claims

      // 2c. Re-check the duplicate guard immediately before the insert.
      //
      // The first check (above) is deliberately placed before any mutation so a
      // duplicate rejection has no side effects, but that leaves a window
      // spanned by the coupon claim and every stock claim. Re-checking here
      // shrinks the unguarded interval to the single insert that follows.
      //
      // This narrows the window; it does NOT close it. The guard is a
      // check-then-act read with no unique index to arbitrate, so simultaneous
      // identical submissions can still both pass. Closing that race needs a
      // client-supplied idempotency key backed by a unique index, which is a
      // schema migration gated on the production dedupe audit. See the D26
      // report; do not treat this as a fix.
      if (dedupeKey && await findRecentDuplicateOrder(String(userId), dedupeKey)) {
        // Compensate in place, then clear the flags. Clearing matters: if either
        // release below were to throw, the catch block must not attempt the same
        // compensation a second time (a second coupon release would decrement
        // usedCount twice).
        await rollbackStockClaims(stagedClaims, 'duplicate-guard-rollback')
        stagedClaims = []
        if (couponCountClaimed && couponId) {
          couponCountClaimed = false
          await releaseCouponCount(couponId)
        }
        return res.status(409).json({ success: false, message: 'This looks like a duplicate order. Please check your recent orders before trying again.' })
      }

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
        dedupeKey,
      })
      createdOrderId = order._id

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
      }).catch((error) => console.error('Order notification failed:', error?.message || error))

      return res.status(201).json({ success: true, message: 'Order created', data: { ...result!.toObject(), items: resultItems } })
    } catch (error) {
      await rollbackStockClaims(stagedClaims, 'checkout-rollback')
      if (couponCountClaimed && couponId) await releaseCouponCount(couponId)
      // Nothing has been sent to the customer yet, so an order persisted before
      // the failure is unreachable garbage. Remove it together with any items
      // that did get written, instead of stranding a PENDING order with no items.
      if (createdOrderId) await discardUnacknowledgedOrder(createdOrderId)
      throw error
    }
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
        const restoration = await restoreStockAndCoupon(order)
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
          newValue: serializeAuditValue({ status: 'CANCELLED', ...restoration }),
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