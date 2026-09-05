import { Router, Response } from 'express'
import { ExchangeRequest } from '../models/exchangeRequest.model'
import { ProductVariant } from '../models/productVariant.model'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRequestNumber, paginate, isValidImei } from '../utils/helpers'
import { normalizeInspectionChecklist, normalizePayout, autoPayoutForExchange } from '../utils/requestValidation'
import { EXCHANGE_TRANSITIONS, assertTransition } from '../services/fsm.service'
import { calculateValuation } from '../services/valuation.service'
import { notify } from '../services/notification.service'
import { checkServiceability } from '../services/serviceability.service'

const router = Router()

const EXCHANGE_STATUSES = Object.keys(EXCHANGE_TRANSITIONS)
const TERMINAL_STATUSES = ['REJECTED', 'CANCELLED', 'COMPLETED']

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
    const { oldBrand, oldModel, oldStorage, oldRam, oldCondition, newVariantId, oldDeviceDetails, phone, alternatePhone, oldImei, oldConditionDetails, pickupPincode } = req.body
    if (!oldBrand || !oldModel || !oldCondition) return res.status(400).json({ success: false, message: 'Old device brand, model, and condition are required' })

    const normalizedImei = oldImei ? oldImei.replace(/\s+/g, '') : undefined
    if (normalizedImei && !isValidImei(normalizedImei)) {
      return res.status(400).json({ success: false, message: 'IMEI must be a valid 15-digit number' })
    }
    if (normalizedImei) {
      const duplicate = await ExchangeRequest.findOne({
        oldImei: normalizedImei,
        status: { $nin: TERMINAL_STATUSES },
      })
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `This device (IMEI ${normalizedImei}) already has an active exchange request (${duplicate.requestNumber}).`,
        })
      }
    }

    // Exchange pickups reuse the sell/pickup-drop serviceability gate when a
    // pincode is supplied.
    if (pickupPincode) {
      const serviceability = await checkServiceability(pickupPincode, 'pickupDrop')
      if (serviceability.configured && !serviceability.serviceable) {
        return res.status(400).json({
          success: false,
          message: `We do not currently offer pickup in PIN code ${pickupPincode}. Please select store drop-off instead.`,
        })
      }
    }

    let variant: any = null
    if (newVariantId) {
      variant = await ProductVariant.findById(newVariantId)
      if (!variant || !variant.isActive) return res.status(400).json({ success: false, message: 'Selected product variant is not available' })
    }

    // Server-authoritative estimate for the old device.
    const valuation = await calculateValuation({
      brand: oldBrand, model: oldModel, storage: oldStorage, ram: oldRam, condition: oldCondition,
      displayCondition: oldConditionDetails?.displayCondition,
      batteryCondition: oldConditionDetails?.batteryCondition,
      bodyCondition: oldConditionDetails?.bodyCondition,
      cameraCondition: oldConditionDetails?.cameraCondition,
      accessoriesAvailable: oldConditionDetails?.accessoriesAvailable,
      originalBill: oldConditionDetails?.originalBill,
      originalBox: oldConditionDetails?.originalBox,
    })

    // Difference is always computed server-side (new price minus exchange value).
    const newPrice = variant ? (variant.discountPrice || variant.price) : null
    const oldValue = valuation.estimatedValue
    const difference = newPrice != null ? Math.max(0, Number(newPrice) - oldValue) : undefined

    const requestNumber = generateRequestNumber('exchange')
    const userId = req.user?.id || null

    const request = await ExchangeRequest.create({
      requestNumber, userId, phone, alternatePhone: alternatePhone ? String(alternatePhone).trim() : undefined,
      oldBrand, oldModel, oldStorage, oldRam, oldCondition,
      oldImei: normalizedImei || undefined,
      valuationSource: valuation.source,
      newVariantId: newVariantId || null,
      oldDeviceDetails: {
        ...(oldDeviceDetails || {}),
        ...(oldConditionDetails || {}),
      },
      estimatedExchangeValue: oldValue > 0 ? oldValue : undefined,
      difference,
      statusHistory: [{ status: 'SUBMITTED', changedAt: new Date(), changedBy: 'SYSTEM', note: 'Exchange request submitted' }],
    })

    if (req.user?.id) {
      await notify({
        userId: req.user.id,
        type: 'EXCHANGE',
        title: 'Exchange request submitted',
        message: `Your exchange request ${requestNumber} for the ${oldBrand} ${oldModel} has been received.`,
        metadata: { requestId: String(request._id), entity: 'exchange_request', status: 'SUBMITTED' },
      }).catch(() => {})
    }

    return res.status(201).json({ success: true, message: 'Exchange request created', data: request })
  } catch (error) {
    console.error('POST /exchange-requests error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, estimatedExchangeValue, finalExchangeValue, difference, adminNotes, note, inspectionChecklist, payout } = req.body
    const request = await ExchangeRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Exchange request not found' })

    const beforeStatus = request.status

    if (status) {
      if (!EXCHANGE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status: ${status}` })
      }
      try {
        assertTransition(request.status, status, EXCHANGE_TRANSITIONS, 'exchange')
      } catch (error: any) {
        return res.status(error?.statusCode || 400).json({ success: false, message: error?.message || 'Invalid status transition' })
      }
      request.statusHistory = request.statusHistory || []
      request.statusHistory.push({ status, changedAt: new Date(), changedBy: 'ADMIN', note: note || `Status updated to ${status}` })
      request.status = status
    }
    if (estimatedExchangeValue !== undefined) {
      const parsed = Number(estimatedExchangeValue)
      if (Number.isFinite(parsed) && parsed >= 0) request.estimatedExchangeValue = parsed
    }
    if (finalExchangeValue !== undefined) {
      const parsed = Number(finalExchangeValue)
      if (Number.isFinite(parsed) && parsed >= 0) request.finalExchangeValue = parsed
    }
    if (difference !== undefined) {
      const parsed = Number(difference)
      if (Number.isFinite(parsed) && parsed >= 0) request.difference = parsed
    }
    if (adminNotes !== undefined) request.adminNotes = adminNotes
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

    // Pure buyback payout: when an exchange is completed with no balance due,
    // the trade-in value is paid out to the customer instead of offsetting a new
    // purchase. Recorded manually; there is no auto-creation here because most
    // exchanges settle as store credit.
    if (status && status === 'COMPLETED' && !request.payout) {
      const outstanding = request.difference ?? 0
      const settledInStore = request.newVariantId && request.finalExchangeValue != null
      if (!settledInStore && (request.finalExchangeValue ?? 0) > 0 && outstanding === 0) {
        request.payout = autoPayoutForExchange(request.finalExchangeValue ?? undefined, request.estimatedExchangeValue ?? undefined) as any
      }
    }

    await request.save()

    if (status && status !== beforeStatus && request.userId) {
      await notify({
        userId: String(request.userId),
        type: 'EXCHANGE',
        title: 'Exchange request updated',
        message: `Your exchange request ${request.requestNumber} is now: ${status.split('_').join(' ').toLowerCase()}.`,
        metadata: { requestId: String(request._id), entity: 'exchange_request', status },
      }).catch(() => {})
    }

    return res.json({ success: true, message: 'Exchange request updated', data: request })
  } catch (error) {
    console.error('PUT /exchange-requests/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router