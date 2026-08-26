import mongoose, { Schema, Document } from 'mongoose'

export interface IWishlist extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  createdAt: Date
}

const wishlistSchema = new Schema<IWishlist>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

wishlistSchema.index({ userId: 1, variantId: 1 }, { unique: true })

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema)
