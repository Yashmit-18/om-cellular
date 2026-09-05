import { Router, Response } from 'express'
import { RepairBooking, RepairStatusHistory, RepairService } from '../models/repair.model'
import { Setting } from '../models/setting.model'
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRepairBookingNumber, paginate } from '../utils/helpers'
import { checkServiceability } from '../services/serviceability.service'
import { REPAIR_TRANSITIONS, assertTransition } from '../services/fsm.service'
import { notify } from '../services/notification.service'

const router = Router()

const REPAIR_STATUSES = Object.keys(REPAIR_TRANSITIONS)

function flattenPickup(details: any): string {
  if (!details) return ''
  const parts = [
    details.name && `Name: ${details.name}`,
    details.phone && `Phone: ${details.phone}`,
    details.addressLine1,
    details.addressLine2,
    details.landmark && `Near: ${details.landmark}`,
    details.city,
    details.state,
    details.pincode,
  ].filter(Boolean)
  return parts.join(', ') || ''
}

async function recordRepairStatus(repair: any, status: string, changedBy: 'SYSTEM' | 'CUSTOMER' | 'ADMIN', note?: string) {
  if (!REPAIR_STATUSES.includes(status)) {
    throw { statusCode: 400, message: `Invalid repair status: ${status}` }
  }
  assertTransition(repair.status, status, REPAIR_TRANSITIONS, 'repair')
  await RepairStatusHistory.create({ repairId: repair._id, status, note })
  repair.statusHistory = repair.statusHistory || []
  repair.statusHistory.push({ status, changedAt: new Date(), changedBy, note })
  repair.status = status
}

async function notifyRepairCustomer(repair: any) {
  if (!repair.userId) return
  await notify({
    userId: String(repair.userId._id || repair.userId),
    type: 'REPAIR',
    title: 'Repair status updated',
    message: `Your repair booking ${repair.bookingNumber} is now: ${repair.status.split('_').join(' ').toLowerCase()}.`,
    metadata: { repairId: String(repair._id), entity: 'repair', status: repair.status },
  }).catch(() => {})
}

router.get('/services', async (_req, res) => {
  try {
    const services = await RepairService.find({ isActive: true }).sort({ sortOrder: 1 })
    return res.json({ success: true, data: services })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'

    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status
    if (search) where.$or = [{ bookingNumber: { $regex: search, $options: 'i' } }, { brand: { $regex: search, $options: 'i' } }, { model: { $regex: search, $options: 'i' } }]

    const [repairs, total] = await Promise.all([
      RepairBooking.find(where).populate('userId', 'name email phone').populate('serviceId').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      RepairBooking.countDocuments(where),
    ])

    return res.json({ success: true, data: repairs, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/track/:bookingNumber', async (req, res) => {
  try {
    const repair = await RepairBooking.findOne({ bookingNumber: req.params.bookingNumber }).populate('serviceId')
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' })

    const statusHistory = await RepairStatusHistory.find({ repairId: repair._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: { ...repair.toObject(), statusHistory } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const repair = await RepairBooking.findById(req.params.id).populate('userId', 'name email phone').populate('serviceId')
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' })

    if (req.user!.role !== 'ADMIN' && repair.userId && repair.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const statusHistory = await RepairStatusHistory.find({ repairId: repair._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: { ...repair.toObject(), statusHistory } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, brand, model, problemDescription, phone, alternatePhone, pickupDetails, serviceMode, appointmentDate, appointmentTime } = req.body
    if (!brand || !model) return res.status(400).json({ success: false, message: 'Brand and model are required' })
    if (!phone || !String(phone).trim()) return res.status(400).json({ success: false, message: 'A contact phone number is required for repair bookings' })

    const mode = serviceMode === 'DOORSTEP_PICKUP' ? 'DOORSTEP_PICKUP' : (req.body.pickupRequired ? 'DOORSTEP_PICKUP' : 'STORE_DROP')
    const addressRequired = mode === 'DOORSTEP_PICKUP'
    if (addressRequired && (!pickupDetails || !pickupDetails.addressLine1 || !pickupDetails.city || !pickupDetails.state || !pickupDetails.pincode)) {
      return res.status(400).json({ success: false, message: 'A complete pickup address (address line, city, state, PIN code) is required for doorstep pickup' })
    }

    if (addressRequired) {
      const serviceability = await checkServiceability(pickupDetails.pincode, 'repair')
      if (serviceability.configured && !serviceability.serviceable) {
        return res.status(400).json({
          success: false,
          message: `We do not currently offer doorstep pickup in PIN code ${pickupDetails.pincode}. Please select store drop-off instead.`,
        })
      }
    }

    let pickupFee = 0
    if (mode === 'DOORSTEP_PICKUP') {
      const feeSetting = await Setting.findOne({ key: 'repair_pickup_drop_fee' })
      pickupFee = Math.max(0, parseInt(feeSetting?.value || '0', 10) || 0)
    }

    const bookingNumber = generateRepairBookingNumber()
    const repair = await RepairBooking.create({
      bookingNumber, userId: req.user?.id || null, serviceId, brand, model, problemDescription, phone,
      alternatePhone: alternatePhone ? String(alternatePhone).trim() : undefined,
      pickupRequired: mode === 'DOORSTEP_PICKUP',
      pickupAddress: mode === 'DOORSTEP_PICKUP' ? flattenPickup(pickupDetails) : undefined,
      pickupDetails: mode === 'DOORSTEP_PICKUP' ? {
        name: pickupDetails.name, phone: pickupDetails.phone || phone, alternatePhone: pickupDetails.alternatePhone || alternatePhone,
        addressLine1: pickupDetails.addressLine1, addressLine2: pickupDetails.addressLine2, landmark: pickupDetails.landmark,
        city: pickupDetails.city, state: pickupDetails.state, pincode: pickupDetails.pincode,
      } : undefined,
      serviceMode: mode, pickupFee,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      appointmentTime,
    })

    const historyNote = `Booking received via ${mode === 'DOORSTEP_PICKUP' ? 'doorstep pickup' : 'store drop-off'}`
    await RepairStatusHistory.create({ repairId: repair._id, status: 'BOOKING_RECEIVED', note: historyNote })
    repair.statusHistory = [{ status: 'BOOKING_RECEIVED', changedAt: new Date(), changedBy: 'SYSTEM', note: historyNote }]
    await repair.save()

    if (req.user?.id) {
      await notify({
        userId: req.user.id,
        type: 'REPAIR',
        title: 'Repair booking received',
        message: `Your repair booking ${bookingNumber} for the ${brand} ${model} has been received.`,
        metadata: { repairId: String(repair._id), entity: 'repair', status: 'BOOKING_RECEIVED' },
      }).catch(() => {})
    }

    return res.status(201).json({ success: true, message: 'Repair booking created', data: { ...repair.toObject(), bookingNumber } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, technicianName, technicianNotes, estimatedCost, finalCost, adminNotes, note } = req.body
    const repair = await RepairBooking.findById(req.params.id)
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' })

    if (status) {
      try {
        await recordRepairStatus(repair, status, 'ADMIN', note || `Status updated to ${status}`)
        await notifyRepairCustomer(repair)
      } catch (error: any) {
        return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Internal server error' })
      }
    }
    if (technicianName !== undefined) repair.technicianName = technicianName
    if (technicianNotes !== undefined) repair.technicianNotes = technicianNotes
    if (estimatedCost !== undefined) repair.estimatedCost = estimatedCost
    if (finalCost !== undefined) repair.finalCost = finalCost
    if (adminNotes !== undefined) repair.adminNotes = adminNotes

    await repair.save()
    return res.json({ success: true, message: 'Repair updated', data: repair })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' })

    const repair = await RepairBooking.findById(req.params.id)
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' })

    try {
      await recordRepairStatus(repair, status, 'ADMIN', note || `Status updated to ${status}`)
      await notifyRepairCustomer(repair)
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ success: false, message: error?.message || 'Internal server error' })
    }
    await repair.save()

    return res.json({ success: true, message: 'Status updated', data: repair })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/services', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, startingPrice, estimatedDuration, warranty, compatibleDevices, category, priceType, icon } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' })

    let slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const existing = await RepairService.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const service = await RepairService.create({ name, slug, description, startingPrice, estimatedDuration, warranty, compatibleDevices, category, priceType, icon })
    return res.status(201).json({ success: true, message: 'Repair service created', data: service })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/services/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const service = await RepairService.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' })
    return res.json({ success: true, message: 'Service updated', data: service })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/services/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await RepairService.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Service deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
