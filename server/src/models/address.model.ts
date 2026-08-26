import mongoose, { Schema, Document } from 'mongoose'

export interface IAddress extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  name: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
  country: string
  isDefault: boolean
  createdAt: Date
}

const addressSchema = new Schema<IAddress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  country: { type: String, default: 'IN' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } })

addressSchema.index({ userId: 1 })

export const Address = mongoose.model<IAddress>('Address', addressSchema)
