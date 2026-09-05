import { Router, Request, Response } from 'express'
import { User } from '../models/user.model'
import { Address } from '../models/address.model'
import { Order } from '../models/order.model'
import { OrderItem } from '../models/order.model'
import { RepairBooking } from '../models/repair.model'
import { SellRequest } from '../models/sellRequest.model'
import { ExchangeRequest } from '../models/exchangeRequest.model'
import { requireAdmin } from '../middleware/auth'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = { role: 'CUSTOMER' }
    if (search) where.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ]

    const [customers, total] = await Promise.all([
      User.find(where).select('-password').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      User.countDocuments(where),
    ])

    const customersWithCounts = await Promise.all(customers.map(async (c) => {
      const orderCount = await Order.countDocuments({ userId: c._id })
      const totalSpent = await Order.aggregate([
        { $match: { userId: c._id, status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP', 'PAYMENT_CONFIRMED', 'DELIVERED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      const defaultAddress = await Address.findOne({ userId: c._id, isDefault: true }).select('city state pincode')
      const anyAddress = await Address.findOne({ userId: c._id }).select('city state pincode')
      const address = defaultAddress || anyAddress
      return {
        ...c.toObject(),
        _count: { orders: orderCount },
        totalSpent: totalSpent[0]?.total || 0,
        city: address?.city || null,
        state: address?.state || null,
        pincode: address?.pincode || null,
      }
    }))

    return res.json({ success: true, data: customersWithCounts, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }).select('-password')
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })

    const [addresses, orders, totalSpent, repairs, sellRequests, exchangeRequests] = await Promise.all([
      Address.find({ userId: customer._id }).sort({ isDefault: -1, createdAt: -1 }),
      Order.find({ userId: customer._id }).sort({ createdAt: -1 }),
      Order.aggregate([
        { $match: { userId: customer._id, status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP', 'PAYMENT_CONFIRMED', 'DELIVERED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      RepairBooking.find({ userId: customer._id }).sort({ createdAt: -1 }),
      SellRequest.find({ userId: customer._id }).sort({ createdAt: -1 }),
      ExchangeRequest.find({ userId: customer._id }).sort({ createdAt: -1 }),
    ])

    const ordersWithItems = await Promise.all(orders.map(async (o) => {
      const items = await OrderItem.find({ orderId: o._id }).populate('variantId')
      return { ...o.toObject(), items }
    }))

    return res.json({
      success: true,
      data: {
        ...customer.toObject(),
        addresses,
        orders: ordersWithItems,
        repairs,
        sellRequests,
        exchangeRequests,
        metrics: {
          orderCount: orders.length,
          totalSpent: totalSpent[0]?.total || 0,
          repairCount: repairs.length,
          sellCount: sellRequests.length,
          exchangeCount: exchangeRequests.length,
        },
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router