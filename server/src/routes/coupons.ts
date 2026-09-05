import { Router, Request, Response } from 'express'
import { Coupon } from '../models/coupon.model'
import { Order } from '../models/order.model'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'
import { writeAudit, serializeAuditValue } from '../services/audit.service'
import { applyCouponDiscount, couponApplicabilityError, validateCouponFields } from '../services/coupon.service'

const router = Router()
type RouteRequest = Request & Partial<AuthRequest>

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (search) where.code = { $regex: search, $options: 'i' }

    const [coupons, total] = await Promise.all([
      Coupon.find(where).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Coupon.countDocuments(where),
    ])

    return res.json({ success: true, data: coupons, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/validate/:code', optionalAuth, async (req: RouteRequest, res: Response) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() })
    if (!coupon || !coupon.isActive) return res.status(404).json({ success: false, message: 'Invalid coupon code' })
    const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()
    const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
    if (!notExpired) return res.status(400).json({ success: false, message: 'Coupon has expired' })
    if (!withinLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached' })

    const total = Math.max(0, parseFloat(String(req.query.total || '0')) || 0)
    const applicabilityError = couponApplicabilityError(coupon as any, total)
    if (applicabilityError) return res.status(400).json({ success: false, message: applicabilityError })

    if (req.user?.id) {
      const usedByUser = await Order.countDocuments({ userId: req.user.id, couponCode: coupon.code, status: { $ne: 'CANCELLED' } })
      const maxPerUser = coupon.maxPerUser || 0
      if (maxPerUser > 0 && usedByUser >= maxPerUser) {
        return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times' })
      }
    }

    const discount = applyCouponDiscount(coupon as any, total)

    // Only surface the fields the storefront needs to render the badge; the
    // internal usage counters and product/category targets stay server-side.
    const publicCoupon = {
      id: String(coupon._id),
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscount: coupon.maxDiscount,
      description: coupon.description,
    }

    return res.json({ success: true, data: { ...publicCoupon, discount } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code, description, type, value, minOrderAmount, maxDiscount, usageLimit, maxPerUser, applicableTo, applicableProductIds, applicableCategoryIds, expiresAt } = req.body
    if (!code || !type || value === undefined) return res.status(400).json({ success: false, message: 'Code, type, and value are required' })
    const invalid = validateCouponFields(req.body)
    if (invalid) return res.status(400).json({ success: false, message: invalid })

    const upperCode = code.toUpperCase().trim()
    const existing = await Coupon.findOne({ code: upperCode })
    if (existing) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' })

    const coupon = await Coupon.create({
      code: upperCode, description, type, value, minOrderAmount, maxDiscount, usageLimit, maxPerUser,
      applicableTo, applicableProductIds, applicableCategoryIds,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    await writeAudit({ adminId: req.user!.id, action: 'COUPON_CREATED', entity: 'Coupon', entityId: String(coupon._id), newValue: serializeAuditValue({ code: upperCode, type, value }), ipAddress: req.ip })

    return res.status(201).json({ success: true, message: 'Coupon created', data: coupon })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' })
    const before = coupon.toObject()

    const invalid = validateCouponFields(req.body)
    if (invalid) return res.status(400).json({ success: false, message: invalid })

    const restricted = ['usedCount', 'createdAt', '_id', '__v']
    const editableKeys = ['code', 'description', 'type', 'value', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'maxPerUser', 'applicableTo', 'applicableProductIds', 'applicableCategoryIds', 'expiresAt', 'isActive']
    const updateBody: any = {}
    for (const [key, value] of Object.entries(req.body)) {
      if (editableKeys.includes(key)) updateBody[key] = value
      else if (!restricted.includes(key)) updateBody[key] = value
    }
    if (!Object.keys(updateBody).length) return res.status(400).json({ success: false, message: 'No changes provided' })
    if (updateBody.code) updateBody.code = String(updateBody.code).toUpperCase().trim()

    const updated = await Coupon.findByIdAndUpdate(req.params.id, updateBody, { new: true })

    await writeAudit({
      adminId: req.user!.id, action: 'COUPON_UPDATED', entity: 'Coupon', entityId: String(req.params.id),
      oldValue: serializeAuditValue(before),
      newValue: serializeAuditValue({ code: updated!.code, type: updated!.type, value: updated!.value, usageLimit: updated!.usageLimit, maxPerUser: updated!.maxPerUser, isActive: updated!.isActive }),
      ipAddress: req.ip,
    })

    return res.json({ success: true, message: 'Coupon updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' })
    await Coupon.findByIdAndUpdate(req.params.id, { isActive: false })
    await writeAudit({ adminId: req.user!.id, action: 'COUPON_DEACTIVATED', entity: 'Coupon', entityId: String(req.params.id), oldValue: coupon.code, newValue: serializeAuditValue({ isActive: false }), ipAddress: req.ip })
    return res.json({ success: true, message: 'Coupon deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
