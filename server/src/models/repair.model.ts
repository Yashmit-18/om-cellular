import mongoose, { Schema } from 'mongoose'

export interface IRepairService {
  _id: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  startingPrice: number
  estimatedDuration?: string
  warranty?: string
  compatibleDevices: string[]
  category: string
  priceType: string
  icon?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const repairServiceSchema = new Schema<IRepairService>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String },
  startingPrice: { type: Number, required: true, min: 0 },
  estimatedDuration: { type: String },
  warranty: { type: String },
  compatibleDevices: { type: [String], default: [] },
  category: { type: String, default: 'General' },
  priceType: { type: String, default: 'starting', enum: ['starting', 'fixed'] },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

export const RepairService = mongoose.model<IRepairService>('RepairService', repairServiceSchema)

export interface IRepairStatus {
  status: string
  changedAt: Date
  changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN'
  note?: string
}

export interface IRepairPickupDetails {
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

export interface IRepairBooking {
  _id: mongoose.Types.ObjectId
  bookingNumber: string
  userId?: mongoose.Types.ObjectId
  serviceId?: mongoose.Types.ObjectId
  phone?: string
  alternatePhone?: string
  brand?: string
  model?: string
  problemDescription?: string
  estimatedCost?: number
  finalCost?: number
  status: string
  statusHistory: IRepairStatus[]
  technicianName?: string
  technicianNotes?: string
  adminNotes?: string
  pickupRequired: boolean
  pickupAddress?: string
  pickupDetails?: IRepairPickupDetails
  serviceMode?: string
  pickupFee?: number
  appointmentDate?: Date
  appointmentTime?: string
  createdAt: Date
  updatedAt: Date
}

const repairStatusSchema = new Schema<IRepairStatus>({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, enum: ['SYSTEM', 'CUSTOMER', 'ADMIN'], default: 'SYSTEM' },
  note: { type: String },
})

const repairPickupDetailsSchema = new Schema<IRepairPickupDetails>({
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

const repairBookingSchema = new Schema<IRepairBooking>({
  bookingNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  serviceId: { type: Schema.Types.ObjectId, ref: 'RepairService', default: null },
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  brand: { type: String },
  model: { type: String },
  problemDescription: { type: String },
  estimatedCost: { type: Number },
  finalCost: { type: Number },
  status: {
    type: String,
    default: 'BOOKING_RECEIVED',
    enum: ['BOOKING_RECEIVED', 'APPROVED', 'IN_DIAGNOSIS', 'DIAGNOSED', 'REJECTED', 'IN_REPAIR', 'AWAITING_PARTS', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  },
  statusHistory: { type: [repairStatusSchema], default: [] },
  technicianName: { type: String },
  technicianNotes: { type: String },
  adminNotes: { type: String },
  pickupRequired: { type: Boolean, default: false },
  pickupAddress: { type: String },
  pickupDetails: { type: repairPickupDetailsSchema, default: null },
  serviceMode: { type: String, default: 'STORE_DROP', enum: ['STORE_DROP', 'DOORSTEP_PICKUP'] },
  pickupFee: { type: Number, default: 0, min: 0 },
  appointmentDate: { type: Date },
  appointmentTime: { type: String },
}, { timestamps: true })

repairBookingSchema.index({ userId: 1 })
repairBookingSchema.index({ status: 1 })

export const RepairBooking = mongoose.model<IRepairBooking>('RepairBooking', repairBookingSchema)

export interface IRepairStatusHistory {
  _id: mongoose.Types.ObjectId
  repairId: mongoose.Types.ObjectId
  status: string
  note?: string
  createdAt: Date
}

const repairStatusHistorySchema = new Schema<IRepairStatusHistory>({
  repairId: { type: Schema.Types.ObjectId, ref: 'RepairBooking', required: true },
  status: { type: String, required: true },
  note: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } })

repairStatusHistorySchema.index({ repairId: 1 })

export const RepairStatusHistory = mongoose.model<IRepairStatusHistory>('RepairStatusHistory', repairStatusHistorySchema)
