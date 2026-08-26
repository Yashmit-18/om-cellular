import { Router, Request, Response } from 'express'
import { Coupon } from '../models/coupon.model'
import { requireAdmin } from '../middleware/auth'
import { paginate } from '../utils/helpers'

const router = Router()

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

router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() })
    if (!coupon || !coupon.isActive) return res.status(404).json({ success: false, message: 'Invalid coupon code' })
    const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()
    const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
    if (!notExpired) return res.status(400).json({ success: false, message: 'Coupon has expired' })
    if (!withinLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached' })
    return res.json({ success: true, data: coupon })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code, description, type, value, minOrderAmount, maxDiscount, usageLimit, applicableTo, applicableProductIds, applicableCategoryIds, expiresAt } = req.body
    if (!code || !type || value === undefined) return res.status(400).json({ success: false, message: 'Code, type, and value are required' })

    const upperCode = code.toUpperCase().trim()
    const existing = await Coupon.findOne({ code: upperCode })
    if (existing) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' })

    const coupon = await Coupon.create({
      code: upperCode, description, type, value, minOrderAmount, maxDiscount, usageLimit,
      applicableTo, applicableProductIds, applicableCategoryIds,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    })

    return res.status(201).json({ success: true, message: 'Coupon created', data: coupon })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' })

    const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true })
    return res.json({ success: true, message: 'Coupon updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Coupon deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
