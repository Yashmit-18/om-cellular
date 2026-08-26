import mongoose, { Schema, Document } from 'mongoose'

export interface IExchangeRequest extends Document {
  _id: mongoose.Types.ObjectId
  requestNumber: string
  userId?: mongoose.Types.ObjectId
  oldBrand: string
  oldModel: string
  oldStorage?: string
  oldRam?: string
  oldCondition: string
  newVariantId?: mongoose.Types.ObjectId
  estimatedExchangeValue?: number
  finalExchangeValue?: number
  difference?: number
  status: string
  oldDeviceDetails: any
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const exchangeRequestSchema = new Schema<IExchangeRequest>({
  requestNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  oldBrand: { type: String, required: true, trim: true },
  oldModel: { type: String, required: true, trim: true },
  oldStorage: { type: String },
  oldRam: { type: String },
  oldCondition: { type: String, required: true },
  newVariantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  estimatedExchangeValue: { type: Number },
  finalExchangeValue: { type: Number },
  difference: { type: Number },
  status: { type: String, default: 'SUBMITTED', enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'] },
  oldDeviceDetails: { type: Schema.Types.Mixed, default: {} },
  adminNotes: { type: String },
}, { timestamps: true })

exchangeRequestSchema.index({ userId: 1 })
exchangeRequestSchema.index({ status: 1 })

export const ExchangeRequest = mongoose.model<IExchangeRequest>('ExchangeRequest', exchangeRequestSchema)
