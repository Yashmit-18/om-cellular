import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  rating: number
  title?: string
  comment?: string
  isApproved: boolean
  isAdminReply: boolean
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true },
  comment: { type: String },
  isApproved: { type: Boolean, default: false },
  isAdminReply: { type: Boolean, default: false },
}, { timestamps: true })

reviewSchema.index({ variantId: 1 })
reviewSchema.index({ userId: 1 })
reviewSchema.index({ isApproved: 1 })

export const Review = mongoose.model<IReview>('Review', reviewSchema)
