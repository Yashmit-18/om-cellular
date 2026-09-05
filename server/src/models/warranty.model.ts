import { Schema, model, Document, Types } from 'mongoose'

export interface IWarrantyStatusHistory {
  status: string
  changedAt: Date
  changedBy: 'SYSTEM' | 'ADMIN'
  note?: string
}

const warrantyStatusHistorySchema = new Schema<IWarrantyStatusHistory>({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, enum: ['SYSTEM', 'ADMIN'], default: 'SYSTEM' },
  note: { type: String },
})

export interface IWarranty extends Document {
  warrantyNumber: string
  orderId: Types.ObjectId
  orderNumber: string
  userId: Types.ObjectId | null
  variantId: Types.ObjectId
  variantName: string
  serialNumber?: string
  startedAt: Date
  expiresAt: Date
  durationMonths: number
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOID'
  statusHistory: IWarrantyStatusHistory[]
  createdAt: Date
  updatedAt: Date
}

const warrantySchema = new Schema<IWarranty>(
  {
    warrantyNumber: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    variantName: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    durationMonths: { type: Number, default: 12, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID'], default: 'ACTIVE' },
    statusHistory: { type: [warrantyStatusHistorySchema], default: [] },
  },
  { timestamps: true }
)

warrantySchema.index({ orderId: 1 })
warrantySchema.index({ userId: 1 })
warrantySchema.index({ variantId: 1 })
warrantySchema.index({ status: 1 })

export const Warranty = model<IWarranty>('Warranty', warrantySchema)