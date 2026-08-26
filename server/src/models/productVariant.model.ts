import mongoose, { Schema } from 'mongoose'

export interface IProductVariant {
  _id: mongoose.Types.ObjectId
  productId: mongoose.Types.ObjectId
  name: string
  sku: string
  price: number
  discountPrice?: number
  stock: number
  reservedStock: number
  soldCount: number
  ram?: string
  storage?: string
  color?: string
  condition?: string
  batteryHealth?: number
  images: string[]
  specifications: Record<string, any>[]
  whatsIncluded: Record<string, any>[]
  isRefurbished: boolean
  featured: boolean
  badge?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const productVariantSchema = new Schema<IProductVariant>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  reservedStock: { type: Number, default: 0, min: 0 },
  soldCount: { type: Number, default: 0, min: 0 },
  ram: { type: String },
  storage: { type: String },
  color: { type: String },
  condition: { type: String },
  batteryHealth: { type: Number },
  images: { type: [String], default: [] },
  specifications: { type: [{ type: Schema.Types.Mixed }], default: [] },
  whatsIncluded: { type: [{ type: Schema.Types.Mixed }], default: [] },
  isRefurbished: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  badge: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

productVariantSchema.index({ productId: 1 })
productVariantSchema.index({ isActive: 1 })
productVariantSchema.index({ sku: 1 })
productVariantSchema.index({ price: 1 })

export const ProductVariant = mongoose.model<IProductVariant>('ProductVariant', productVariantSchema)
