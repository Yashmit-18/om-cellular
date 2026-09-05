import { Order, OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { Inventory } from '../models/inventory.model'
import { Coupon } from '../models/coupon.model'
import { recordInventoryMovement } from '../models/inventoryLedger.model'

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