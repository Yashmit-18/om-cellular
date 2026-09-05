import { Schema, model, Document, Types } from 'mongoose'

export interface IReturnRequestStatus {
  status: string
  changedAt: Date
  changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN'
  note?: string
}

const returnRequestStatusSchema = new Schema<IReturnRequestStatus>({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, enum: ['SYSTEM', 'CUSTOMER', 'ADMIN'], default: 'SYSTEM' },
  note: { type: String },
})

export interface IReturnRequest extends Document {
  returnNumber: string
  orderId: Types.ObjectId
  userId: Types.ObjectId | null
  items: { variantId: Types.ObjectId; quantity: number; price: number }[]
  reason: string
  description?: string
  status: string
  statusHistory: IReturnRequestStatus[]
  refundAmount: number
  refundId?: string
  refundedAt?: Date
  trackingNumber?: string
  adminNote?: string
  createdAt: Date
  updatedAt: Date
}

const returnRequestSchema = new Schema<IReturnRequest>(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    items: [
      {
        variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['RETURN_REQUESTED', 'ADMIN_REVIEW', 'RETURN_APPROVED', 'RETURN_REJECTED', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED'],
      default: 'RETURN_REQUESTED',
    },
    statusHistory: { type: [returnRequestStatusSchema], default: [] },
    refundAmount: { type: Number, required: true, min: 0 },
    refundId: { type: String, trim: true },
    refundedAt: { type: Date, default: null },
    trackingNumber: { type: String, trim: true },
    adminNote: { type: String, trim: true },
  },
  { timestamps: true }
)

returnRequestSchema.index({ orderId: 1 })
returnRequestSchema.index({ userId: 1 })
returnRequestSchema.index({ status: 1 })

export const ReturnRequest = model<IReturnRequest>('ReturnRequest', returnRequestSchema)
