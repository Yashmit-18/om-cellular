import { Router, Response } from 'express'
import { SellRequest } from '../models/sellRequest.model'
import { ExchangeRequest } from '../models/exchangeRequest.model'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRequestNumber, paginate, isValidImei } from '../utils/helpers'
import { normalizeInspectionChecklist, normalizePayout, autoPayoutForSell } from '../utils/requestValidation'
import { checkServiceability } from '../services/serviceability.service'
import { SELL_TRANSITIONS, assertTransition } from '../services/fsm.service'
import { calculateValuation } from '../services/valuation.service'
import { notify } from '../services/notification.service'

const router = Router()

const SELL_STATUSES = Object.keys(SELL_TRANSITIONS)
const TERMINAL_STATUSES = ['REJECTED', 'CANCELLED', 'PAYMENT_COMPLETED']

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

    if (req.user!.role !== 'ADMIN' && (!request.userId || request.userId._id.toString() !== req.user!.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({ success: true, data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox, phone, alternatePhone, pickupDetails, pickupAddress, pickupDate, pickupTime, imei } = req.body
    if (!brand || !model || !condition) return res.status(400).json({ success: false, message: 'Brand, model, and condition are required' })

    const normalizedImei = imei ? imei.replace(/\s+/g, '') : undefined
    if (normalizedImei && !isValidImei(normalizedImei)) {
      return res.status(400).json({ success: false, message: 'IMEI must be a valid 15-digit number' })
    }
    if (normalizedImei) {
      const duplicate = await SellRequest.findOne({
        imei: normalizedImei,
        status: { $nin: TERMINAL_STATUSES },
      })
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `This device (IMEI ${normalizedImei}) already has an active sell request (${duplicate.requestNumber}). You will be able to list it again once the current request is completed or cancelled.`,
        })
      }
      // Cross-entity guard: the same device must not be tied to an active
      // exchange request at the same time.
      const crossDuplicate = await ExchangeRequest.findOne({
        oldImei: normalizedImei,
        status: { $nin: ['REJECTED', 'CANCELLED', 'COMPLETED'] },
      })
      if (crossDuplicate) {
        return res.status(409).json({
          success: false,
          message: `This device (IMEI ${normalizedImei}) is already part of an active exchange request (${crossDuplicate.requestNumber}). Use the Sell page only after that exchange is completed or cancelled.`,
        })
      }
    }

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

    // Server-authoritative estimate. The client-provided value is never used.
    const valuation = await calculateValuation({
      brand, model, storage, ram, age, condition,
      displayCondition, batteryCondition, bodyCondition, cameraCondition,
      accessoriesAvailable: !!accessoriesAvailable, originalBill: !!originalBill, originalBox: !!originalBox,
    })

    const requestNumber = generateRequestNumber('sell')
    const userId = req.user?.id || null

    const request = await SellRequest.create({
      requestNumber, userId, phone, alternatePhone: alternatePhone ? String(alternatePhone).trim() : undefined,
      brand, model, storage, ram, age, condition,
      displayCondition, batteryCondition, cameraCondition, bodyCondition,
      accessoriesAvailable: !!accessoriesAvailable, originalBill: !!originalBill, originalBox: !!originalBox,
      imei: normalizedImei || undefined,
      valuationSource: valuation.source,
      estimatedPrice: valuation.estimatedValue > 0 ? valuation.estimatedValue : undefined,
      pickupAddress: usePickup ? (pickupAddress || flattenPickup(pickupDetails)) : undefined,
      pickupDetails: usePickup && pickupDetails ? {
        name: pickupDetails.name, phone: pickupDetails.phone || phone, alternatePhone: pickupDetails.alternatePhone || alternatePhone,
        addressLine1: pickupDetails.addressLine1, addressLine2: pickupDetails.addressLine2, landmark: pickupDetails.landmark,
        city: pickupDetails.city, state: pickupDetails.state, pincode: pickupDetails.pincode,
      } : undefined,
      pickupDate: pickupDate ? new Date(pickupDate) : undefined, pickupTime,
      statusHistory: [{ status: 'SUBMITTED', changedAt: new Date(), changedBy: 'SYSTEM', note: 'Sell request submitted' }],
    })

    if (req.user?.id) {
      await notify({
        userId: req.user.id,
        type: 'SELL',
        title: 'Sell request submitted',
        message: `Your sell request ${requestNumber} for the ${brand} ${model} has been received. We will contact you within 24 hours.`,
        metadata: { requestId: String(request._id), entity: 'sell_request', status: 'SUBMITTED' },
      }).catch(() => {})
    }

    const data = request.toObject()
    if (valuation.source === 'unavailable') {
      return res.status(201).json({
        success: true,
        message: 'Request submitted. Our team will assess your device and contact you with a final offer.',
        data,
      })
    }
    return res.status(201).json({ success: true, message: 'Sell request created', data })
  } catch (error) {
    console.error('POST /sell-requests error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, finalOfferedPrice, estimatedPrice, adminNotes, pickupDate, pickupTime, pickupAddress, pickupDetails, note, inspectionChecklist, payout } = req.body
    const request = await SellRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Sell request not found' })

    const beforeStatus = request.status

    if (status) {
      if (!SELL_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` })
      }
      try {
        assertTransition(request.status, status, SELL_TRANSITIONS, 'sell')
      } catch (error: any) {
        return res.status(error?.statusCode || 400).json({ success: false, message: error?.message || 'Invalid status transition' })
      }
      request.statusHistory = request.statusHistory || []
      request.statusHistory.push({ status, changedAt: new Date(), changedBy: 'ADMIN', note: note || `Status updated to ${status}` })
      request.status = status
    }
    if (finalOfferedPrice !== undefined) {
      const parsed = Number(finalOfferedPrice)
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ success: false, message: 'finalOfferedPrice must be a non-negative number' })
      }
      request.finalOfferedPrice = parsed
    }
    if (estimatedPrice !== undefined) {
      // Admins may adjust the estimate; guard against negative/garbage values.
      const parsed = Number(estimatedPrice)
      if (Number.isFinite(parsed) && parsed >= 0) request.estimatedPrice = parsed
    }
    if (adminNotes !== undefined) request.adminNotes = adminNotes
    if (pickupDate !== undefined) request.pickupDate = new Date(pickupDate)
    if (pickupTime !== undefined) request.pickupTime = pickupTime
    if (pickupAddress !== undefined) request.pickupAddress = pickupAddress
    if (pickupDetails !== undefined) request.pickupDetails = pickupDetails || undefined
    if (inspectionChecklist !== undefined) {
      const result = normalizeInspectionChecklist(inspectionChecklist)
      if (!result.ok) return res.status(400).json({ success: false, message: result.message })
      request.inspectionChecklist = result.value as any
    }
    if (payout !== undefined) {
      const result = normalizePayout(payout, request.payout)
      if (!result.ok) return res.status(400).json({ success: false, message: result.message })
      request.payout = result.value as any
    }

    // Completing the deal always yields a payout record (defaults to the final
    // offered price) so the money flow is auditable end-to-end.
    if (status && status === 'PAYMENT_COMPLETED' && !request.payout) {
      request.payout = autoPayoutForSell(request.finalOfferedPrice ?? undefined, request.estimatedPrice ?? undefined) as any
    }

    await request.save()

    if (status && status !== beforeStatus && request.userId) {
      await notify({
        userId: String(request.userId),
        type: 'SELL',
        title: 'Sell request updated',
        message: `Your sell request ${request.requestNumber} is now: ${status.split('_').join(' ').toLowerCase()}.`,
        metadata: { requestId: String(request._id), entity: 'sell_request', status },
      }).catch(() => {})
    }

    return res.json({ success: true, message: 'Sell request updated', data: request })
  } catch (error) {
    console.error('PUT /sell-requests/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
