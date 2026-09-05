import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderStatusHistory {
  status: string
  changedAt: Date
  changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN'
  note?: string
}

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
  couponCode?: string
  couponDiscount: number
  status: string
  paymentStatus: string
  paymentMethod?: string
  paymentGateway?: string
  statusHistory: IOrderStatusHistory[]
  shippingAddress?: Record<string, unknown>
  upiReferenceId?: string
  trackingNumber?: string
  notes?: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  razorpayRefundId?: string
  refundAmount?: number
  refundedAt?: Date
  stockRestored: boolean
  couponRestored: boolean
  paidAt?: Date
  dedupeKey?: string
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

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: String, enum: ['SYSTEM', 'CUSTOMER', 'ADMIN'], default: 'SYSTEM' },
  note: { type: String },
})

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
  couponCode: { type: String, trim: true, uppercase: true },
  couponDiscount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    default: 'PENDING',
    enum: ['PENDING', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCEL_REQUESTED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUND_PENDING', 'CANCELLED', 'REFUNDED', 'RETURNED', 'FAILED'],
  },
  paymentStatus: { type: String, default: 'PENDING', enum: ['PENDING', 'PENDING_PAYMENT', 'PAID', 'REFUND_PENDING', 'FAILED', 'REFUNDED'] },
  paymentMethod: { type: String, enum: ['cod', 'online', 'upi', 'netbanking', 'card', 'wallet'] },
  paymentGateway: { type: String, enum: ['razorpay', 'cod', 'manual'] },
  statusHistory: { type: [orderStatusHistorySchema], default: [] },
  shippingAddress: { type: Schema.Types.Mixed, default: null },
  upiReferenceId: { type: String, trim: true },
  trackingNumber: { type: String },
  notes: { type: String },
  razorpayOrderId: { type: String, trim: true },
  razorpayPaymentId: { type: String, trim: true },
  razorpaySignature: { type: String, trim: true },
  razorpayRefundId: { type: String, trim: true },
  refundAmount: { type: Number },
  refundedAt: { type: Date, default: null },
  stockRestored: { type: Boolean, default: false },
  couponRestored: { type: Boolean, default: false },
  paidAt: { type: Date, default: null },
  dedupeKey: { type: String, trim: true, index: true },
}, { timestamps: true })

orderSchema.index({ userId: 1 })
orderSchema.index({ status: 1 })
orderSchema.index({ createdAt: -1 })

export const Order = mongoose.model<IOrder>('Order', orderSchema)
