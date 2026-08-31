import { Router, Response } from 'express'
import { Order, OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { Coupon } from '../models/coupon.model'
import { Setting } from '../models/setting.model'
import { Address } from '../models/address.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateOrderNumber, paginate } from '../utils/helpers'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search, startDate, endDate } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'

    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status
    if (search) where.$or = [{ orderNumber: { $regex: search, $options: 'i' } }]
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.$gte = new Date(startDate as string)
      if (endDate) where.createdAt.$lte = new Date(endDate as string)
    }

    const [orders, total] = await Promise.all([
      Order.find(where).populate('userId', 'name email phone').populate('address').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Order.countDocuments(where),
    ])

    const ordersWithItems = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.find({ orderId: o._id }).populate('variantId')
      return { ...o.toObject(), items }
    }))

    return res.json({ success: true, data: ordersWithItems, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    console.error('GET /orders error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('userId', 'name email phone').populate('address')
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    if (req.user!.role !== 'ADMIN' && order.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const items = await OrderItem.find({ orderId: order._id }).populate('variantId')
    return res.json({ success: true, data: { ...order.toObject(), items } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { items, addressId, address, couponCode, paymentMethod, notes, upiReferenceId } = req.body
    const userId = req.user!.id

    if (!items || !items.length) return res.status(400).json({ success: false, message: 'Items are required' })
    if (paymentMethod && !['cod', 'online', 'upi', 'netbanking', 'card', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' })
    }

    let subtotal = 0
    const orderItems: any[] = []

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId)
      if (!variant || !variant.isActive) return res.status(400).json({ success: false, message: 'Product variant not available' })
      if (variant.stock < item.quantity || item.quantity < 1) return res.status(400).json({ success: false, message: `Insufficient stock for ${variant.name}` })

      const price = variant.discountPrice || variant.price
      const itemTotal = price * item.quantity
      orderItems.push({
        variantId: variant._id, quantity: item.quantity, price: variant.price,
        discount: variant.discountPrice ? (variant.price - variant.discountPrice) * item.quantity : 0,
        total: itemTotal,
      })
      subtotal += itemTotal
    }

    const settings = await Setting.find({ key: { $in: ['tax_rate', 'free_shipping_threshold', 'standard_shipping_price'] } })
    const settingsMap: Record<string, string> = {}
    for (const s of settings) settingsMap[s.key] = s.value || ''

    const taxRate = parseFloat(settingsMap.tax_rate || '0.18') || 0.18
    const freeShippingThreshold = parseInt(settingsMap.free_shipping_threshold || '999') || 999
    const standardShippingPrice = parseInt(settingsMap.standard_shipping_price || '99') || 99

    const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingPrice
    const tax = Math.round(subtotal * taxRate * 100) / 100

    let resolvedAddress = null
    if (addressId) {
      resolvedAddress = await Address.findById(addressId)
      if (!resolvedAddress) return res.status(400).json({ success: false, message: 'Address not found' })
      if (resolvedAddress.userId.toString() !== userId) {
        return res.status(400).json({ success: false, message: 'Invalid delivery address' })
      }
    } else if (address?.addressLine1 && address?.city && address?.state && address?.pincode) {
      if (!address.name || !String(address.phone || '').trim()) {
        return res.status(400).json({ success: false, message: 'Recipient name and phone are required' })
      }
      const savedAddress = await Address.create({
        userId, name: address.name, phone: address.phone || '', addressLine1: address.addressLine1,
        addressLine2: address.addressLine2, city: address.city, state: address.state, pincode: address.pincode,
        country: address.country || 'IN', isDefault: false,
      })
      resolvedAddress = savedAddress
    }

    if (!resolvedAddress) {
      return res.status(400).json({ success: false, message: 'A valid delivery address is required' })
    }

    // Snapshot the address onto the order so it never changes if the user edits their saved address later.
    const shippingAddress = {
      name: resolvedAddress.name,
      phone: resolvedAddress.phone,
      addressLine1: resolvedAddress.addressLine1,
      addressLine2: resolvedAddress.addressLine2 || '',
      city: resolvedAddress.city,
      state: resolvedAddress.state,
      pincode: resolvedAddress.pincode,
      country: resolvedAddress.country || 'IN',
    }

    let couponDiscount = 0
    let couponId = null
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })
      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()
        const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const meetsMinimum = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount
        if (notExpired && withinLimit && meetsMinimum) {
          if (coupon.type === 'PERCENTAGE') {
            couponDiscount = subtotal * (coupon.value / 100)
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) couponDiscount = coupon.maxDiscount
          } else if (coupon.type === 'FIXED') {
            couponDiscount = coupon.value
          }
          couponDiscount = Math.round(couponDiscount * 100) / 100
          couponId = coupon._id
        }
      }
    }

    const total = Math.max(0, subtotal + shipping + tax - couponDiscount)
    const orderNumber = generateOrderNumber()
    const paymentStatus = paymentMethod && paymentMethod !== 'cod' ? 'PENDING_PAYMENT' : 'PENDING'

    const order = await Order.create({
      orderNumber, userId, addressId: resolvedAddress!.id, subtotal, shipping, tax, total,
      couponId, couponDiscount, paymentMethod: paymentMethod || 'cod',
      paymentStatus, shippingAddress,
      upiReferenceId: paymentMethod && paymentMethod !== 'cod' && upiReferenceId ? String(upiReferenceId).trim() : undefined,
      notes,
    })

    for (const item of orderItems) {
      await OrderItem.create({ orderId: order._id, ...item })
    }

    for (const item of orderItems) {
      await ProductVariant.findByIdAndUpdate(item.variantId, {
        $inc: { stock: -item.quantity, soldCount: item.quantity },
      })
    }

    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } })
    }

    const result = await Order.findById(order._id).populate('userId', 'name email')
    const resultItems = await OrderItem.find({ orderId: order._id }).populate('variantId')

    return res.status(201).json({ success: true, message: 'Order created', data: { ...result!.toObject(), items: resultItems } })
  } catch (error) {
    console.error('POST /orders error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    return res.json({ success: true, message: 'Order updated', data: order })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
