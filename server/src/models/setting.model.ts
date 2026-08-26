import mongoose, { Schema, Document } from 'mongoose'

export interface ISetting extends Document {
  _id: mongoose.Types.ObjectId
  key: string
  value?: string
  group?: string
  createdAt: Date
  updatedAt: Date
}

const settingSchema = new Schema<ISetting>({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: String },
  group: { type: String },
}, { timestamps: true })

settingSchema.index({ group: 1 })

export const Setting = mongoose.model<ISetting>('Setting', settingSchema)
