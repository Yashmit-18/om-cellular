import mongoose, { Schema } from 'mongoose'

export interface ISellRequestStatus {
  status: string
  changedAt: Date
  changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN'
  note?: string
}

export interface ISellPickupDetails {
  name?: string
  phone?: string
  alternatePhone?: string
  addressLine1?: string
  addressLine2?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
}

export interface ISellRequest {
  _id: mongoose.Types.ObjectId
  requestNumber: string
  userId?: mongoose.Types.ObjectId
  phone?: string
  alternatePhone?: string
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
  statusHistory: ISellRequestStatus[]
  pickupAddress?: string
  pickupDetails?: ISellPickupDetails
  pickupDate?: Date
  pickupTime?: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const sellRequestStatusSchema = new Schema<ISellRequestStatus>({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, enum: ['SYSTEM', 'CUSTOMER', 'ADMIN'], default: 'SYSTEM' },
  note: { type: String },
})

const sellPickupDetailsSchema = new Schema<ISellPickupDetails>({
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  addressLine1: { type: String, trim: true },
  addressLine2: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
})

const sellRequestSchema = new Schema<ISellRequest>({
  requestNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
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
  status: {
    type: String,
    default: 'SUBMITTED',
    enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'CANCELLED'],
  },
  statusHistory: { type: [sellRequestStatusSchema], default: [] },
  pickupAddress: { type: String },
  pickupDetails: { type: sellPickupDetailsSchema, default: null },
  pickupDate: { type: Date },
  pickupTime: { type: String },
  adminNotes: { type: String },
}, { timestamps: true })

sellRequestSchema.index({ userId: 1 })
sellRequestSchema.index({ status: 1 })

export const SellRequest = mongoose.model<ISellRequest>('SellRequest', sellRequestSchema)
