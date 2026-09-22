import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  orderId: mongoose.Types.ObjectId
  orderItemId: mongoose.Types.ObjectId
  rating: number
  title?: string
  comment: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  isVerifiedPurchase: boolean
  isApproved: boolean
  isAdminReply: boolean
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderItemId: { type: Schema.Types.ObjectId, ref: 'OrderItem', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 120 },
  comment: { type: String, trim: true, required: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  isVerifiedPurchase: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isAdminReply: { type: Boolean, default: false },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 })
reviewSchema.index({ orderItemId: 1 }, { unique: true, sparse: true })
reviewSchema.index({ variantId: 1 })
reviewSchema.index({ userId: 1 })
reviewSchema.index({ isApproved: 1 })

export const Review = mongoose.model<IReview>('Review', reviewSchema)
