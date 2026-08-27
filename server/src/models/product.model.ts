import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  brandId?: mongoose.Types.ObjectId
  categoryId?: mongoose.Types.ObjectId
  isFeatured: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  isRefurbished: boolean
  condition?: string
  warranty?: string
  returnPolicy?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String },
  brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isRefurbished: { type: Boolean, default: false },
  condition: { type: String },
  warranty: { type: String },
  returnPolicy: { type: String },
  seoTitle: { type: String },
  seoDescription: { type: String },
  seoKeywords: { type: String },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

productSchema.index({ categoryId: 1 })
productSchema.index({ brandId: 1 })
productSchema.index({ isActive: 1 })
productSchema.index({ isFeatured: 1 })

productSchema.virtual('brand', { ref: 'Brand', localField: 'brandId', foreignField: '_id', justOne: true })
productSchema.virtual('category', { ref: 'Category', localField: 'categoryId', foreignField: '_id', justOne: true })

export const Product = mongoose.model<IProduct>('Product', productSchema)
