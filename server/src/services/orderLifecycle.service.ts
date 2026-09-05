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
export async function restoreStockAndCoupon(order: any): Promise<boolean> {
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
    await syncInventory(item.variantId, +item.quantity, { reason: 'ORDER_CANCELLED', referenceType: 'Order', referenceId: order._id }).catch(() => {})
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