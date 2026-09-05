import mongoose, { Schema, Document } from 'mongoose'

export interface IServiceAreaServices {
  delivery: boolean
  repair: boolean
  pickupDrop: boolean
  sell: boolean
  exchange: boolean
}

export interface IServiceArea extends Document {
  _id: mongoose.Types.ObjectId
  city: string
  state: string
  pinCodes: string[]
  isEnabled: boolean
  services: IServiceAreaServices
  createdAt: Date
  updatedAt: Date
}

const serviceAreaSchema = new Schema<IServiceArea>({
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pinCodes: { type: [String], required: true, default: [] },
  isEnabled: { type: Boolean, default: true },
  services: {
    type: {
      delivery: { type: Boolean, default: true },
      repair: { type: Boolean, default: true },
      pickupDrop: { type: Boolean, default: true },
      sell: { type: Boolean, default: true },
      exchange: { type: Boolean, default: true },
    },
    default: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true },
  },
}, { timestamps: true })

serviceAreaSchema.index({ pinCodes: 1 })

export const ServiceArea = mongoose.model<IServiceArea>('ServiceArea', serviceAreaSchema)