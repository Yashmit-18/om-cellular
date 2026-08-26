import mongoose, { Schema } from 'mongoose'

export interface ISellRequest {
  _id: mongoose.Types.ObjectId
  requestNumber: string
  userId?: mongoose.Types.ObjectId
  brand: string
  model: string
  storage?: string
  ram?: string
  age?: string
  condition: string
  displayCondition?: string
  batteryCondition?: string
  cameraCondition?: string
  bodyCondition?: string
  accessoriesAvailable: boolean
  originalBill: boolean
  originalBox: boolean
  estimatedPrice?: number
  finalOfferedPrice?: number
  status: string
  pickupAddress?: string
  pickupDate?: Date
  pickupTime?: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const sellRequestSchema = new Schema<ISellRequest>({
  requestNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  storage: { type: String },
  ram: { type: String },
  age: { type: String },
  condition: { type: String, required: true },
  displayCondition: { type: String },
  batteryCondition: { type: String },
  cameraCondition: { type: String },
  bodyCondition: { type: String },
  accessoriesAvailable: { type: Boolean, default: false },
  originalBill: { type: Boolean, default: false },
  originalBox: { type: Boolean, default: false },
  estimatedPrice: { type: Number },
  finalOfferedPrice: { type: Number },
  status: { type: String, default: 'SUBMITTED', enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'CANCELLED'] },
  pickupAddress: { type: String },
  pickupDate: { type: Date },
  pickupTime: { type: String },
  adminNotes: { type: String },
}, { timestamps: true })

sellRequestSchema.index({ userId: 1 })
sellRequestSchema.index({ status: 1 })

export const SellRequest = mongoose.model<ISellRequest>('SellRequest', sellRequestSchema)
