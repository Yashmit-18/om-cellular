import mongoose, { Schema, Document } from 'mongoose'

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId
  orderNumber: string
  userId: mongoose.Types.ObjectId
  addressId?: mongoose.Types.ObjectId
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  couponId?: mongoose.Types.ObjectId
  couponDiscount: number
  status: string
  paymentStatus: string
  paymentMethod?: string
  trackingNumber?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface IOrderItem extends Document {
  _id: mongoose.Types.ObjectId
  orderId: mongoose.Types.ObjectId
  variantId: mongoose.Types.ObjectId
  quantity: number
  price: number
  discount: number
  total: number
}

const orderItemSchema = new Schema<IOrderItem>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
})

orderItemSchema.index({ orderId: 1 })
orderItemSchema.index({ variantId: 1 })

export const OrderItem = mongoose.model<IOrderItem>('OrderItem', orderItemSchema)

const orderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  addressId: { type: Schema.Types.ObjectId, ref: 'Address', default: null },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
  couponDiscount: { type: Number, default: 0, min: 0 },
  status: { type: String, default: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] },
  paymentStatus: { type: String, default: 'PENDING', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] },
  paymentMethod: { type: String },
  trackingNumber: { type: String },
  notes: { type: String },
}, { timestamps: true })

orderSchema.index({ userId: 1 })
orderSchema.index({ status: 1 })
orderSchema.index({ createdAt: -1 })
orderSchema.index({ orderNumber: 1 })

export const Order = mongoose.model<IOrder>('Order', orderSchema)
