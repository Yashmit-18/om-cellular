import { Router, Response } from 'express'
import { Review } from '../models/review.model'
import { Order, OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', variantId, approvedOnly = 'true' } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (variantId) where.variantId = variantId
    // Pending/unapproved reviews are only ever visible to admins; public
    // callers (or anyone missing an admin token) always get approved reviews.
    const isAdmin = req.user?.role === 'ADMIN'
    if (approvedOnly === 'true' || !isAdmin) where.isApproved = true

    const [reviews, total] = await Promise.all([
      Review.find(where).populate('userId', 'name image').populate('variantId', 'name').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Review.countDocuments(where),
    ])

    return res.json({ success: true, data: reviews, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { variantId, rating, title, comment } = req.body
    const userId = req.user!.id

    if (!variantId || !rating) return res.status(400).json({ success: false, message: 'Variant ID and rating are required' })
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })

    const variant = await ProductVariant.findById(variantId)
    if (!variant) return res.status(404).json({ success: false, message: 'Product variant not found' })

    const existingReview = await Review.findOne({ userId, variantId })
    if (existingReview) return res.status(409).json({ success: false, message: 'You have already reviewed this product' })

    const deliveredOrders = await Order.find({ userId, status: 'DELIVERED' }).select('_id')
    if (!deliveredOrders.length) return res.status(403).json({ success: false, message: 'You can only review products you have purchased and received' })

    // The review must reference a variant this user actually bought and
    // received. A generic "user has some delivered order" is not enough.
    const purchasedItem = await OrderItem.findOne({
      variantId,
      orderId: { $in: deliveredOrders.map((o) => o._id) },
    })
    if (!purchasedItem) return res.status(403).json({ success: false, message: 'You can only review products that are part of your delivered orders' })

    const review = await Review.create({ userId, variantId, rating, title, comment })
    return res.status(201).json({ success: true, message: 'Review submitted', data: review })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { isApproved, isAdminReply, comment } = req.body
    const review = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' })

    if (isApproved !== undefined) review.isApproved = isApproved
    if (isAdminReply !== undefined) review.isAdminReply = isAdminReply
    if (comment !== undefined) review.comment = comment

    await review.save()
    return res.json({ success: true, message: 'Review updated', data: review })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await Review.findByIdAndDelete(req.params.id)
    return res.json({ success: true, message: 'Review deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
