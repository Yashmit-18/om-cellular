import { Router, Request, Response } from 'express'
import { User } from '../models/user.model'
import { Order } from '../models/order.model'
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
        { $match: { userId: c._id, status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ])
      return { ...c.toObject(), _count: { orders: orderCount }, totalSpent: totalSpent[0]?.total || 0 }
    }))

    return res.json({ success: true, data: customersWithCounts, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
