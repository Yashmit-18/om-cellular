import { Order, OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { Inventory } from '../models/inventory.model'
import { Coupon } from '../models/coupon.model'

export async function syncInventory(variantId: any, delta: number) {
  await Inventory.updateOne(
    { variantId },
    { $inc: { quantity: delta }, $setOnInsert: { reservedQuantity: 0, lowStockThreshold: 5 } },
    { upsert: true }
  )
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
    await syncInventory(item.variantId, +item.quantity).catch(() => {})
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