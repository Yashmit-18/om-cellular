import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId
  code: string
  description?: string
  type: string
  value: number
  minOrderAmount?: number
  maxDiscount?: number
  usageLimit?: number
  usedCount: number
  applicableTo: string
  applicableProductIds: string[]
  applicableCategoryIds: string[]
  expiresAt?: Date
  isActive: boolean
  createdAt: Date
}

const couponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  type: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED'] },
  value: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number },
  maxDiscount: { type: Number },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 },
  applicableTo: { type: String, default: 'ALL' },
  applicableProductIds: { type: [String], default: [] },
  applicableCategoryIds: { type: [String], default: [] },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

couponSchema.index({ isActive: 1 })

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema)
