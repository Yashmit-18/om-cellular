import mongoose, { Schema, Document } from 'mongoose'

export interface IContactRequest extends Document {
  _id: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status: string
  adminNotes?: string
  createdAt: Date
  updatedAt: Date
}

const contactRequestSchema = new Schema<IContactRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String },
  subject: { type: String },
  message: { type: String, required: true },
  status: { type: String, default: 'PENDING', enum: ['PENDING', 'READ', 'REPLIED', 'ARCHIVED'] },
  adminNotes: { type: String },
}, { timestamps: true })

contactRequestSchema.index({ status: 1 })
contactRequestSchema.index({ createdAt: -1 })

export const ContactRequest = mongoose.model<IContactRequest>('ContactRequest', contactRequestSchema)
