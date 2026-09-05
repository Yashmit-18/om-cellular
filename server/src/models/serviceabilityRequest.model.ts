import mongoose, { Schema, Document } from 'mongoose'

export type RequestedService = 'delivery' | 'repair' | 'pickupDrop' | 'sell' | 'exchange'
export type NotifyStatus = 'WAITING' | 'NOTIFIED' | 'CLOSED'

export interface IServiceabilityRequest extends Document {
  _id: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  name: string
  phone: string
  alternatePhone?: string
  city: string
  state: string
  pincode: string
  requestedService: RequestedService
  status: NotifyStatus
  contactedVia?: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const serviceabilityRequestSchema = new Schema<IServiceabilityRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  requestedService: { type: String, enum: ['delivery', 'repair', 'pickupDrop', 'sell', 'exchange'], required: true },
  status: { type: String, enum: ['WAITING', 'NOTIFIED', 'CLOSED'], default: 'WAITING' },
  contactedVia: { type: String, trim: true },
  adminNotes: { type: String },
}, { timestamps: true })

serviceabilityRequestSchema.index({ status: 1 })
serviceabilityRequestSchema.index({ pincode: 1 })

export const ServiceabilityRequest = mongoose.model<IServiceabilityRequest>('ServiceabilityRequest', serviceabilityRequestSchema)