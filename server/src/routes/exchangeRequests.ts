import { Router, Response } from 'express'
import { ExchangeRequest } from '../models/exchangeRequest.model'
import { ProductVariant } from '../models/productVariant.model'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRequestNumber, paginate } from '../utils/helpers'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'

    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status
    if (search) where.$or = [{ requestNumber: { $regex: search, $options: 'i' } }, { oldBrand: { $regex: search, $options: 'i' } }, { oldModel: { $regex: search, $options: 'i' } }]

    const [requests, total] = await Promise.all([
      ExchangeRequest.find(where).populate('userId', 'name email phone').populate('newVariantId').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ExchangeRequest.countDocuments(where),
    ])

    return res.json({ success: true, data: requests, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await ExchangeRequest.findById(req.params.id).populate('userId', 'name email phone').populate('newVariantId')
    if (!request) return res.status(404).json({ success: false, message: 'Exchange request not found' })

    if (req.user!.role !== 'ADMIN' && request.userId && request.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({ success: true, data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { oldBrand, oldModel, oldStorage, oldRam, oldCondition, newVariantId, oldDeviceDetails } = req.body
    if (!oldBrand || !oldModel || !oldCondition) return res.status(400).json({ success: false, message: 'Old device brand, model, and condition are required' })

    if (newVariantId) {
      const variant = await ProductVariant.findById(newVariantId)
      if (!variant || !variant.isActive) return res.status(400).json({ success: false, message: 'Selected product variant is not available' })
    }

    const requestNumber = generateRequestNumber('exchange')
    const userId = req.user?.id || null

    const request = await ExchangeRequest.create({
      requestNumber, userId, oldBrand, oldModel, oldStorage, oldRam, oldCondition,
      newVariantId: newVariantId || null, oldDeviceDetails: oldDeviceDetails || {},
    })

    return res.status(201).json({ success: true, message: 'Exchange request created', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, estimatedExchangeValue, finalExchangeValue, difference, adminNotes } = req.body
    const request = await ExchangeRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Exchange request not found' })

    if (status) request.status = status
    if (estimatedExchangeValue !== undefined) request.estimatedExchangeValue = estimatedExchangeValue
    if (finalExchangeValue !== undefined) request.finalExchangeValue = finalExchangeValue
    if (difference !== undefined) request.difference = difference
    if (adminNotes !== undefined) request.adminNotes = adminNotes

    await request.save()
    return res.json({ success: true, message: 'Exchange request updated', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
