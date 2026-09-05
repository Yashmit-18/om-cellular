import { OrderItem } from '../models/order.model'
import { Warranty } from '../models/warranty.model'
import { notify } from './notification.service'
import { writeAudit } from './audit.service'

// Number generator shared with the order/return flows. Kept local to this
// service to avoid a new dependency on the helpers module.
function generateWarrantyNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `OMW-${year}-${random}`
}

export interface WarrantyIssuance {
  orderId: string
  variantId: string
  variantName?: string
  durationMonths?: number
  startedAt?: Date
}

// Issues a warranty for each item of a delivered order. Idempotent per order +
// variant: a matching ACTIVE warranty means this was already issued. Failures
// are best-effort and never block delivery completion.
export async function issueWarrantyForOrder(order: any): Promise<number> {
  const items = await OrderItem.find({ orderId: order._id })
  const existing = await Warranty.findOne({ orderId: order._id, status: 'ACTIVE' })
  if (existing) return 0

  const durationMonths = Number(order.warrantyDurationMonths || 12)
  const startedAt = new Date()
  const expiresAt = new Date(startedAt)
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  const userId = order.userId && order.userId._id ? String(order.userId._id) : order.userId || null

  const documents = items.map((item: any) => ({
    warrantyNumber: generateWarrantyNumber(),
    orderId: order._id,
    orderNumber: order.orderNumber,
    userId,
    variantId: item.variantId,
    variantName: item.variantName || undefined,
    startedAt,
    expiresAt,
    durationMonths,
    statusHistory: [
      { status: 'ACTIVE', changedAt: startedAt, changedBy: 'SYSTEM', note: `Warranty issued on delivery (${durationMonths} months)` },
    ],
  }))

  if (!documents.length) return 0

  const inserted = await Warranty.insertMany(documents)
  if (userId) {
    await notify({
      userId,
      type: 'ORDER',
      title: 'Warranty issued',
      message: `${inserted.length} warranty${inserted.length > 1 ? 'ies' : 'y'} for order ${order.orderNumber} are now active until ${expiresAt.toLocaleDateString('en-IN')}.`,
      metadata: { orderId: String(order._id), entity: 'warranty', count: inserted.length },
    })
  }
  await writeAudit({
    action: 'WARRANTIES_ISSUED', entity: 'Warranty', entityId: String(order._id),
    newValue: JSON.stringify({ orderNumber: order.orderNumber, count: inserted.length, months: durationMonths }),
  })
  return inserted.length
}