import mongoose, { Schema, Document } from 'mongoose'

export interface IInventory extends Document {
  _id: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  quantity: number
  reservedQuantity: number
  lowStockThreshold: number
  updatedAt: Date
}

const inventorySchema = new Schema<IInventory>({
  variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true, unique: true },
  quantity: { type: Number, default: 0, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: { updatedAt: true, createdAt: false } })

export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema)
