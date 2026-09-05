import mongoose, { Schema, Document } from 'mongoose'

export const INVENTORY_MOVEMENT_TYPES = [
  'ORDER_PLACED',
  'ORDER_CANCELLED',
  'MANUAL_ADJUSTMENT',
  'RETURN_RECEIVED',
  'INITIAL_STOCK',
  'RESERVED',
  'RESERVATION_RELEASED',
] as const

export interface IInventoryLedgerEntry extends Document {
  _id: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  productId?: mongoose.Types.ObjectId
  delta: number
  reason: (typeof INVENTORY_MOVEMENT_TYPES)[number]
  quantityAfter: number
  reservedDelta?: number
  reservedAfter?: number
  referenceType?: string
  referenceId?: mongoose.Types.ObjectId
  adminId?: mongoose.Types.ObjectId
  note?: string
  createdAt: Date
}

const inventoryLedgerSchema = new Schema<IInventoryLedgerEntry>(
  {
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    delta: { type: Number, required: true },
    reason: { type: String, enum: INVENTORY_MOVEMENT_TYPES, required: true },
    quantityAfter: { type: Number, required: true },
    reservedDelta: { type: Number, default: 0 },
    reservedAfter: { type: Number, default: null },
    referenceType: { type: String, trim: true },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

inventoryLedgerSchema.index({ variantId: 1, createdAt: -1 })
inventoryLedgerSchema.index({ referenceId: 1 })

export const InventoryLedgerEntry = mongoose.model<IInventoryLedgerEntry>('InventoryLedgerEntry', inventoryLedgerSchema)

// Writes an audit entry for a stock movement. Best effort — a broken ledger
// write must never break the business operation that produced the movement.
export async function recordInventoryMovement(entry: {
  variantId: any
  productId?: any
  delta: number
  reason: (typeof INVENTORY_MOVEMENT_TYPES)[number]
  quantityAfter: number
  reservedDelta?: number
  reservedAfter?: number
  referenceType?: string
  referenceId?: any
  adminId?: any
  note?: string
}): Promise<void> {
  try {
    await InventoryLedgerEntry.create({
      variantId: entry.variantId,
      productId: entry.productId || null,
      delta: entry.delta,
      reason: entry.reason,
      quantityAfter: entry.quantityAfter,
      reservedDelta: entry.reservedDelta || 0,
      reservedAfter: entry.reservedAfter ?? null,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId || null,
      adminId: entry.adminId || null,
      note: entry.note,
    })
  } catch (error) {
    console.error('Inventory ledger write failed:', (error as Error)?.message || error)
  }
}