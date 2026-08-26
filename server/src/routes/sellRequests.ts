import { Router, Response } from 'express'
import { SellRequest } from '../models/sellRequest.model'
import { authenticate, requireAdmin } from '../middleware/auth'
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
    if (search) where.$or = [{ requestNumber: { $regex: search, $options: 'i' } }, { brand: { $regex: search, $options: 'i' } }, { model: { $regex: search, $options: 'i' } }]

    const [requests, total] = await Promise.all([
      SellRequest.find(where).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      SellRequest.countDocuments(where),
    ])

    return res.json({ success: true, data: requests, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await SellRequest.findById(req.params.id).populate('userId', 'name email phone')
    if (!request) return res.status(404).json({ success: false, message: 'Sell request not found' })

    if (req.user!.role !== 'ADMIN' && request.userId && request.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({ success: true, data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox, pickupAddress, pickupDate, pickupTime } = req.body
    if (!brand || !model || !condition) return res.status(400).json({ success: false, message: 'Brand, model, and condition are required' })

    const requestNumber = generateRequestNumber('sell')
    const userId = req.user?.id || null

    const request = await SellRequest.create({
      requestNumber, userId, brand, model, storage, ram, age, condition,
      displayCondition, batteryCondition, cameraCondition, bodyCondition,
      accessoriesAvailable: !!accessoriesAvailable, originalBill: !!originalBill, originalBox: !!originalBox,
      pickupAddress, pickupDate: pickupDate ? new Date(pickupDate) : undefined, pickupTime,
    })

    return res.status(201).json({ success: true, message: 'Sell request created', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, finalOfferedPrice, estimatedPrice, adminNotes, pickupDate, pickupTime, pickupAddress } = req.body
    const request = await SellRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Sell request not found' })

    if (status) request.status = status
    if (finalOfferedPrice !== undefined) request.finalOfferedPrice = finalOfferedPrice
    if (estimatedPrice !== undefined) request.estimatedPrice = estimatedPrice
    if (adminNotes !== undefined) request.adminNotes = adminNotes
    if (pickupDate !== undefined) request.pickupDate = new Date(pickupDate)
    if (pickupTime !== undefined) request.pickupTime = pickupTime
    if (pickupAddress !== undefined) request.pickupAddress = pickupAddress

    await request.save()
    return res.json({ success: true, message: 'Sell request updated', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
