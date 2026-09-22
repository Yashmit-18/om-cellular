import { Router, Response } from 'express'
import { Review } from '../models/review.model'
import { OrderItem } from '../models/order.model'
import { ProductVariant } from '../models/productVariant.model'
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'
import { writeAudit, serializeAuditValue } from '../services/audit.service'
import { getProductRatingSummary, isMatchingOrderItem, isValidObjectId, refreshProductRating, reviewSort, validateReviewInput } from '../services/review.service'

const router = Router()

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '10', variantId, productId } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user?.role === 'ADMIN'
    const where: any = {}
    if (variantId) {
      if (!isValidObjectId(variantId)) return res.status(400).json({ success: false, message: 'Invalid variant id' })
      where.variantId = variantId
    }
    if (productId) {
      if (!isValidObjectId(productId)) return res.status(400).json({ success: false, message: 'Invalid product id' })
      where.productId = productId
    }
    if (req.query.orderId) {
      if (!req.user || !isValidObjectId(req.query.orderId)) return res.status(401).json({ success: false, message: 'Authentication required' })
      where.orderId = req.query.orderId
      where.userId = req.user.id
    }
    if (!isAdmin) {
      where.status = 'APPROVED'
      where.isApproved = true
      where.isVerifiedPurchase = true
    } else if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(String(req.query.status))) {
      where.status = String(req.query.status)
    }
    if (req.query.search && isAdmin) {
      const search = String(req.query.search).slice(0, 80)
      where.$or = [{ title: { $regex: search, $options: 'i' } }, { comment: { $regex: search, $options: 'i' } }]
    }
    const [reviews, total, summary] = await Promise.all([
      Review.find(where).populate('userId', 'name image').populate('productId', 'name slug').populate('variantId', 'name').populate('orderId', 'orderNumber').sort(reviewSort(String(req.query.sort || 'newest'))).skip(skip).limit(safeLimit),
      Review.countDocuments(where),
      productId && !isAdmin ? getProductRatingSummary(String(productId)) : Promise.resolve(null),
    ])
    return res.json({ success: true, data: reviews, summary, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) } })
  } catch (error) {
    console.error('GET /reviews error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { variantId, orderItemId } = req.body
    if (!isValidObjectId(variantId) || !isValidObjectId(orderItemId)) return res.status(400).json({ success: false, message: 'Valid variantId and orderItemId are required' })
    const validated = validateReviewInput(req.body)
    if ('error' in validated) return res.status(400).json({ success: false, message: validated.error })
    const item: any = await OrderItem.findOne({ _id: orderItemId, variantId }).populate('orderId')
    const order: any = item?.orderId
    if (!isMatchingOrderItem(item, order, req.user!.id, String(variantId), String(orderItemId))) return res.status(403).json({ success: false, message: 'This order item is not yours' })
    const variant: any = await ProductVariant.findOne({ _id: variantId }).lean()
    if (!variant) return res.status(404).json({ success: false, message: 'Product variant not found' })
    if (await Review.exists({ orderItemId })) return res.status(409).json({ success: false, message: 'This purchase has already been reviewed' })
    const review = await Review.create({ userId: req.user!.id, productId: variant.productId, variantId, orderId: order._id, orderItemId, ...validated.value, status: 'PENDING', isApproved: false, isVerifiedPurchase: true })
    return res.status(201).json({ success: true, message: 'Review submitted for moderation', data: review })
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'This purchase has already been reviewed' })
    console.error('POST /reviews error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Review not found' })
    const review: any = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' })
    if (String(review.userId) !== req.user!.id) return res.status(403).json({ success: false, message: 'Review ownership required' })
    const validated = validateReviewInput(req.body)
    if ('error' in validated) return res.status(400).json({ success: false, message: validated.error })
    review.set({ ...validated.value, status: 'PENDING', isApproved: false })
    await review.save()
    await refreshProductRating(review.productId)
    return res.json({ success: true, message: 'Review updated and returned to moderation', data: review })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Review not found' })
    const review: any = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' })
    if (String(review.userId) !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Review ownership required' })
    await Review.deleteOne({ _id: review._id })
    await refreshProductRating(review.productId)
    return res.json({ success: true, message: 'Review deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id) || !['PENDING', 'APPROVED', 'REJECTED'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid review status' })
    const review: any = await Review.findById(req.params.id)
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' })
    const previous = review.status
    review.status = req.body.status
    review.isApproved = req.body.status === 'APPROVED'
    await review.save()
    const summary = await refreshProductRating(review.productId)
    await writeAudit({ adminId: req.user!.id, action: `REVIEW_${req.body.status}`, entity: 'Review', entityId: String(review._id), oldValue: serializeAuditValue({ status: previous }), newValue: serializeAuditValue({ status: review.status }), ipAddress: req.ip })
    return res.json({ success: true, message: 'Review status updated', data: review, summary })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
