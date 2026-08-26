import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name?: string
  email?: string
  emailVerified?: Date
  image?: string
  phone?: string
  password?: string
  role: 'ADMIN' | 'CUSTOMER'
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>({
  name: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  emailVerified: { type: Date },
  image: { type: String },
  phone: { type: String, trim: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['ADMIN', 'CUSTOMER'], default: 'CUSTOMER' },
}, { timestamps: true })

userSchema.index({ role: 1 })

export const User = mongoose.model<IUser>('User', userSchema)
