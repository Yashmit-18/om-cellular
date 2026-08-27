import mongoose, { Schema } from 'mongoose'

export interface IPhoneCatalogModel {
  _id: mongoose.Types.ObjectId
  brandName: string
  modelName: string
  slug: string
  storageVariants: Array<{
    storage: string
    ram: string
    baseValue: number
  }>
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const phoneCatalogModelSchema = new Schema<IPhoneCatalogModel>({
  brandName: { type: String, required: true, trim: true },
  modelName: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  storageVariants: [{
    storage: { type: String, required: true },
    ram: { type: String, default: '' },
    baseValue: { type: Number, required: true, min: 0 },
  }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

phoneCatalogModelSchema.index({ brandName: 1 })
phoneCatalogModelSchema.index({ isActive: 1 })
phoneCatalogModelSchema.index({ brandName: 1, modelName: 1 })

export const PhoneCatalogModel = mongoose.model<IPhoneCatalogModel>('PhoneCatalogModel', phoneCatalogModelSchema)
