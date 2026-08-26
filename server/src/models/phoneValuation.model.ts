import mongoose, { Schema } from 'mongoose'

export interface IPhoneValuation {
  _id: mongoose.Types.ObjectId
  brand: string
  model: string
  baseValue: number
  storageAdjustment: Record<string, number>
  ramAdjustment: Record<string, number>
  ageDepreciation: Record<string, number>
  conditionMultiplier: Record<string, number>
  displayDeduction: number
  batteryDeduction: number
  bodyDeduction: number
  cameraDeduction: number
  accessoryDeduction: number
  billDeduction: number
  boxDeduction: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const phoneValuationSchema = new Schema<IPhoneValuation>({
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  baseValue: { type: Number, required: true, min: 0 },
  storageAdjustment: { type: Schema.Types.Mixed, default: {} },
  ramAdjustment: { type: Schema.Types.Mixed, default: {} },
  ageDepreciation: { type: Schema.Types.Mixed, default: {} },
  conditionMultiplier: { type: Schema.Types.Mixed, default: {} },
  displayDeduction: { type: Number, default: 0 },
  batteryDeduction: { type: Number, default: 0 },
  bodyDeduction: { type: Number, default: 0 },
  cameraDeduction: { type: Number, default: 0 },
  accessoryDeduction: { type: Number, default: 0 },
  billDeduction: { type: Number, default: 0 },
  boxDeduction: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

phoneValuationSchema.index({ brand: 1, model: 1 }, { unique: true })
phoneValuationSchema.index({ brand: 1 })
phoneValuationSchema.index({ isActive: 1 })

export const PhoneValuation = mongoose.model<IPhoneValuation>('PhoneValuation', phoneValuationSchema)
