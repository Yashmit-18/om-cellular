import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: string
  title: string
  message: string
  isRead: boolean
  metadata: any
  createdAt: Date
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } })

notificationSchema.index({ userId: 1 })
notificationSchema.index({ isRead: 1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
