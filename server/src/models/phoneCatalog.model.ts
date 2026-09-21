import mongoose, { Schema } from 'mongoose'

export interface IPhoneCatalogModel {
  _id: mongoose.Types.ObjectId
  brandName: string
  modelName: string
  slug: string
  image?: string
  storageVariants: Array<{
    storage: string
    ram: string
    baseValue: number
  }>
  // Optional fields used by the non-phone expansion catalog (tablets,
  // smartwatches, accessories). Absent on legacy smartphone catalog models.
  categorySlug?: string
  condition?: string
  description?: string
  specs?: Array<{ key: string; value: string }>
  colors?: string[]
  whatsIncluded?: string[]
  labels?: Array<{ label: string; ram?: string; price: number; discountPrice: number }>
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const phoneCatalogModelSchema = new Schema<IPhoneCatalogModel>({
  brandName: { type: String, required: true, trim: true },
  modelName: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: { type: String, trim: true },
  storageVariants: [{
    storage: { type: String, required: true },
    ram: { type: String, default: '' },
    baseValue: { type: Number, required: true, min: 0 },
  }],
  categorySlug: { type: String, default: 'smartphones', trim: true },
  condition: { type: String, trim: true },
  description: { type: String },
  specs: { type: [{ _id: false, key: String, value: String }], default: undefined },
  colors: { type: [String], default: undefined },
  whatsIncluded: { type: [String], default: undefined },
  labels: {
    type: [{ _id: false, label: String, ram: String, price: Number, discountPrice: Number }],
    default: undefined,
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } })

phoneCatalogModelSchema.index({ brandName: 1 })
phoneCatalogModelSchema.index({ isActive: 1 })
phoneCatalogModelSchema.index({ brandName: 1, modelName: 1 })

export const PhoneCatalogModel = mongoose.model<IPhoneCatalogModel>('PhoneCatalogModel', phoneCatalogModelSchema)
