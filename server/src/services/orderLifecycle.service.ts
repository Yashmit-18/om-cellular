import { Order, OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { Inventory } from '../models/inventory.model'
import { Coupon } from '../models/coupon.model'
import { recordInventoryMovement } from '../models/inventoryLedger.model'
import { env } from '../config/env'

export interface PendingPaymentSweepMetrics {
  scanned: number
  eligible: number
  cancelled: number
  stockRestored: number
  couponsReleased: number
  skippedRace: number
  errors: number
}

export interface PendingPaymentSweepDependencies {
  findCandidates: (filter: Record<string, unknown>) => Promise<any[]>
  claim: (candidate: any, filter: Record<string, unknown>, now: Date) => Promise<any | null>
  restore: (order: any) => Promise<{ restored: boolean; couponReleased: boolean }>
}

export function pendingPaymentCutoff(now = new Date(), timeoutMinutes = env.PENDING_PAYMENT_TIMEOUT_MINUTES): Date {
  return new Date(now.getTime() - timeoutMinutes * 60 * 1000)
}

export async function sweepAbandonedPendingPayments(now = new Date(), dependencies?: PendingPaymentSweepDependencies): Promise<PendingPaymentSweepMetrics> {
  const metrics: PendingPaymentSweepMetrics = { scanned: 0, eligible: 0, cancelled: 0, stockRestored: 0, couponsReleased: 0, skippedRace: 0, errors: 0 }
  const cutoff = pendingPaymentCutoff(now)
  const filter = { status: 'PENDING', paymentStatus: 'PENDING_PAYMENT', createdAt: { $lt: cutoff } }
  const defaults: PendingPaymentSweepDependencies = {
    findCandidates: async query => Order.find(query).lean(),
    claim: async (candidate, query, sweepNow) => Order.findOneAndUpdate(
      { _id: candidate._id, ...query },
      {
        $set: { status: 'CANCELLED' },
        $push: { statusHistory: { status: 'CANCELLED', changedAt: sweepNow, changedBy: 'SYSTEM', note: 'Expired abandoned pending payment' } },
      },
      { new: true }
    ),
    restore: async order => ({ restored: await restoreStockAndCoupon(order, 'ORDER_CANCELLED'), couponReleased: Boolean(order.couponId) }),
  }
  const runner = dependencies || defaults
  const candidates = await runner.findCandidates(filter)
  metrics.scanned = candidates.length

  for (const candidate of candidates) {
    metrics.eligible++
    try {
      const claimed = await runner.claim(candidate, filter, now)
      if (!claimed) {
        metrics.skippedRace++
        continue
      }

      metrics.cancelled++
      const restored = await runner.restore(claimed)
      if (restored.restored) {
        metrics.stockRestored++
        if (restored.couponReleased) metrics.couponsReleased++
      }
    } catch (error) {
      metrics.errors++
      console.error('Pending payment sweep item failed:', error instanceof Error ? error.message : error)
    }
  }
  return metrics
}

export async function syncInventory(
  variantId: any,
  delta: number,
  options: { reason?: 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'MANUAL_ADJUSTMENT' | 'RETURN_RECEIVED' | 'INITIAL_STOCK' | 'RESERVED' | 'RESERVATION_RELEASED'; referenceType?: string; referenceId?: any; lowStockThreshold?: number } = {}
) {
  const previous = await Inventory.findOne({ variantId })
  await Inventory.updateOne(
    { variantId },
    {
      $inc: { quantity: delta },
      $setOnInsert: { reservedQuantity: 0, lowStockThreshold: options.lowStockThreshold ?? previous?.lowStockThreshold ?? 5 },
    },
    { upsert: true }
  )
  const after = await Inventory.findOne({ variantId })
  await recordInventoryMovement({
    variantId,
    delta,
    reason: options.reason || 'MANUAL_ADJUSTMENT',
    quantityAfter: after?.quantity ?? 0,
    referenceType: options.referenceType,
    referenceId: options.referenceId,
  }).catch(() => {})
}

// Idempotent stock + coupon restoration for an order that will never be
// fulfilled (cancelled or payment failed). Returns true when the restoration
// was performed by this call — concurrent callers are de-duplicated with the
// stockRestored flag claim.
export async function restoreStockAndCoupon(order: any, reason: 'ORDER_CANCELLED' | 'RETURN_RECEIVED' = 'ORDER_CANCELLED'): Promise<boolean> {
  const claim = await Order.findOneAndUpdate(
    { _id: order._id, stockRestored: false },
    { $set: { stockRestored: true } }
  )
  if (!claim) return false

  const items = await OrderItem.find({ orderId: order._id })
  for (const item of items) {
    await ProductVariant.findByIdAndUpdate(item.variantId, {
      $inc: { stock: +item.quantity, soldCount: -item.quantity },
    }).catch(() => {})
    await syncInventory(item.variantId, +item.quantity, { reason, referenceType: 'Order', referenceId: order._id }).catch(() => {})
  }

  if (order.couponId) {
    const couponClaim = await Order.findOneAndUpdate(
      { _id: order._id, couponRestored: false, couponId: { $exists: true, $ne: null } },
      { $set: { couponRestored: true } }
    )
    if (couponClaim) {
      await Coupon.findOneAndUpdate(
        { _id: order.couponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } }
      ).catch(() => {})
    }
  }
  return true
}

// Re-consumes stock and coupon usage for an order that previously failed but
// was actually settled at the gateway (FAILED -> PAID recovery). The stock and
// coupon were released by restoreStockAndCoupon when the payment failed, so the
// flags are claimed back so a later cancellation can restore them again.
// Returns { ok: false, reason } when stock cannot be re-allocated.
export async function consumeStockAndCoupon(order: any): Promise<{ ok: boolean; reason?: string }> {
  const items = await OrderItem.find({ orderId: order._id })
  for (const item of items) {
    const updated = await ProductVariant.findOneAndUpdate(
      { _id: item.variantId, isActive: true, stock: { $gte: +item.quantity } },
      { $inc: { stock: -item.quantity, soldCount: +item.quantity } }
    )
    if (!updated) {
      // Roll back any variants already decremented in this call.
      for (const previous of items.slice(0, items.indexOf(item))) {
        await ProductVariant.findByIdAndUpdate(previous.variantId, {
          $inc: { stock: +previous.quantity, soldCount: -previous.quantity },
        }).catch(() => {})
        await syncInventory(previous.variantId, +previous.quantity, { reason: 'ORDER_CANCELLED', referenceType: 'Order', referenceId: order._id }).catch(() => {})
      }
      return { ok: false, reason: `Stock is no longer available for one or more items in order ${order.orderNumber}.` }
    }
    await syncInventory(item.variantId, -item.quantity, { reason: 'ORDER_PLACED', referenceType: 'Order', referenceId: order._id }).catch(() => {})
  }

  if (order.couponId) {
    const claimed = await Coupon.findOneAndUpdate(
      { _id: order.couponId, $or: [{ usageLimit: { $exists: false } }, { usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
      { $inc: { usedCount: 1 } }
    )
    if (!claimed) return { ok: false, reason: `Coupon ${order.couponCode || ''} is no longer available. Please contact support.` }
  }

  await Order.updateOne({ _id: order._id }, { $set: { stockRestored: false, couponRestored: false } }).catch(() => {})
  return { ok: true }
}