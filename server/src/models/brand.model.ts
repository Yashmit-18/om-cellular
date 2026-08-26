import mongoose, { Schema, Document } from 'mongoose'

export interface IBrand extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  logo?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const brandSchema = new Schema<IBrand>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

brandSchema.index({ isActive: 1 })
brandSchema.index({ sortOrder: 1 })

export const Brand = mongoose.model<IBrand>('Brand', brandSchema)
