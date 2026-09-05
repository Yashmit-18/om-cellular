import { Router, Response } from 'express'
import { SellRequest } from '../models/sellRequest.model'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRequestNumber, paginate } from '../utils/helpers'
import { checkServiceability } from '../services/serviceability.service'

const router = Router()

const SELL_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'CANCELLED']

function flattenPickup(details: any): string {
  if (!details) return ''
  return [
    details.name && `Name: ${details.name}`,
    details.phone && `Phone: ${details.phone}`,
    details.addressLine1,
    details.addressLine2,
    details.landmark && `Near: ${details.landmark}`,
    details.city,
    details.state,
    details.pincode,
  ].filter(Boolean).join(', ')
}

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

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox, phone, alternatePhone, pickupDetails, pickupAddress, pickupDate, pickupTime, estimatedPrice } = req.body
    if (!brand || !model || !condition) return res.status(400).json({ success: false, message: 'Brand, model, and condition are required' })

    const usePickup = !!(pickupDetails?.addressLine1 || pickupAddress)
    if (usePickup) {
      const pincode = pickupDetails?.pincode
      if (pincode) {
        const serviceability = await checkServiceability(pincode, 'pickupDrop')
        if (serviceability.configured && !serviceability.serviceable) {
          return res.status(400).json({
            success: false,
            message: `We do not currently offer pickup in PIN code ${pincode}. Please select store drop-off instead.`,
          })
        }
      }
    }

    const requestNumber = generateRequestNumber('sell')
    const userId = req.user?.id || null

    const request = await SellRequest.create({
      requestNumber, userId, phone, alternatePhone: alternatePhone ? String(alternatePhone).trim() : undefined,
      brand, model, storage, ram, age, condition,
      displayCondition, batteryCondition, cameraCondition, bodyCondition,
      accessoriesAvailable: !!accessoriesAvailable, originalBill: !!originalBill, originalBox: !!originalBox,
      estimatedPrice: estimatedPrice !== undefined && estimatedPrice !== null ? Number(estimatedPrice) || 0 : undefined,
      pickupAddress: usePickup ? (pickupAddress || flattenPickup(pickupDetails)) : undefined,
      pickupDetails: usePickup && pickupDetails ? {
        name: pickupDetails.name, phone: pickupDetails.phone || phone, alternatePhone: pickupDetails.alternatePhone || alternatePhone,
        addressLine1: pickupDetails.addressLine1, addressLine2: pickupDetails.addressLine2, landmark: pickupDetails.landmark,
        city: pickupDetails.city, state: pickupDetails.state, pincode: pickupDetails.pincode,
      } : undefined,
      pickupDate: pickupDate ? new Date(pickupDate) : undefined, pickupTime,
      statusHistory: [{ status: 'SUBMITTED', changedAt: new Date(), changedBy: 'SYSTEM', note: 'Sell request submitted' }],
    })

    return res.status(201).json({ success: true, message: 'Sell request created', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, finalOfferedPrice, estimatedPrice, adminNotes, pickupDate, pickupTime, pickupAddress, pickupDetails, note } = req.body
    const request = await SellRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Sell request not found' })

    if (status) {
      if (!SELL_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` })
      }
      request.statusHistory = request.statusHistory || []
      request.statusHistory.push({ status, changedAt: new Date(), changedBy: 'ADMIN', note: note || `Status updated to ${status}` })
      request.status = status
    }
    if (finalOfferedPrice !== undefined) request.finalOfferedPrice = finalOfferedPrice
    if (estimatedPrice !== undefined) request.estimatedPrice = estimatedPrice
    if (adminNotes !== undefined) request.adminNotes = adminNotes
    if (pickupDate !== undefined) request.pickupDate = new Date(pickupDate)
    if (pickupTime !== undefined) request.pickupTime = pickupTime
    if (pickupAddress !== undefined) request.pickupAddress = pickupAddress
    if (pickupDetails !== undefined) request.pickupDetails = pickupDetails || undefined

    await request.save()
    return res.json({ success: true, message: 'Sell request updated', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
