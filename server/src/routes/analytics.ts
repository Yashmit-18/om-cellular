import { Router, Response } from 'express'
import { Order } from '../models/order.model'
import { RepairBooking } from '../models/repair.model'
import { SellRequest } from '../models/sellRequest.model'
import { ExchangeRequest } from '../models/exchangeRequest.model'
import { User } from '../models/user.model'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'

const router = Router()

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalSales,
      todaySales,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRepairs,
      pendingRepairs,
      completedRepairs,
      totalSellRequests,
      pendingSellRequests,
      totalExchangeRequests,
      pendingExchangeRequests,
      totalCustomers,
      totalProducts,
      activeProducts,
      lowStockProducts,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
      Order.countDocuments({ status: 'PENDING' }),
      Order.countDocuments({ status: 'DELIVERED' }),
      Order.countDocuments({ status: 'CANCELLED' }),
      RepairBooking.countDocuments(),
      RepairBooking.countDocuments({ status: { $in: ['BOOKING_RECEIVED', 'IN_DIAGNOSIS', 'DIAGNOSED', 'IN_REPAIR'] } }),
      RepairBooking.countDocuments({ status: 'COMPLETED' }),
      SellRequest.countDocuments(),
      SellRequest.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      ExchangeRequest.countDocuments(),
      ExchangeRequest.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      User.countDocuments({ role: 'CUSTOMER' }),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      ProductVariant.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: 'inventories', localField: '_id', foreignField: 'variantId', as: 'inventory' } },
        { $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $lte: ['$stock', { $ifNull: ['$inventory.lowStockThreshold', 5] }] } } },
        { $count: 'count' },
      ]),
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const salesChart = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    const ordersChart = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])

    return res.json({
      success: true,
      data: {
        totalSales: totalSales[0]?.total || 0,
        todaySales: todaySales[0]?.total || 0,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        totalRepairs,
        pendingRepairs,
        completedRepairs,
        totalSellRequests,
        pendingSellRequests,
        totalExchangeRequests,
        pendingExchangeRequests,
        totalCustomers,
        totalProducts,
        activeProducts,
        lowStockProducts: lowStockProducts[0]?.count || 0,
        salesChart,
        ordersChart,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
