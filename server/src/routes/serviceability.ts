import { Router, Response } from 'express'
import mongoose from 'mongoose'
import { ServiceArea } from '../models/serviceArea.model'
import { ServiceabilityRequest, RequestedService } from '../models/serviceabilityRequest.model'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { checkServiceability } from '../services/serviceability.service'
import { paginate, normalizePhone } from '../utils/helpers'
import { writeAudit, serializeAuditValue } from '../services/audit.service'

const router = Router()

const SERVICE_LABELS: RequestedService[] = ['delivery', 'repair', 'pickupDrop', 'sell', 'exchange']

// Public: check serviceability of a pincode for one or more services.
router.post('/check', async (req: AuthRequest, res: Response) => {
  try {
    const { pincode, services } = req.body
    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code' })
    }

    const requested: RequestedService[] = services && Array.isArray(services) && services.length
      ? (services as RequestedService[]).filter((s) => SERVICE_LABELS.includes(s))
      : ['delivery']

    if (!requested.length) {
      return res.status(400).json({ success: false, message: 'No valid services requested' })
    }

    const results: Record<string, any> = {}
    for (const service of requested) {
      results[service] = await checkServiceability(pincode, service)
    }

    return res.json({ success: true, data: { pincode: String(pincode).trim(), configured: requested.some((s) => results[s].configured), results, serviceable: requested.every((s) => results[s].serviceable) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin: list service areas with optional pincode lookup.
router.get('/areas', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, enabled, delivery } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (search) {
      where.$or = [
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { pinCodes: String(search) },
      ]
    }
    if (enabled === 'true' || enabled === 'false') where.isEnabled = enabled === 'true'
    if (delivery === 'true') where['services.delivery'] = true
    if (delivery === 'false') where['services.delivery'] = false

    const [areas, total, configuredPins, serviceableAreas, inactiveAreas] = await Promise.all([
      ServiceArea.find(where).sort({ city: 1, state: 1 }).skip(skip).limit(safeLimit),
      ServiceArea.countDocuments(where),
      ServiceArea.countDocuments({ isEnabled: true }),
      ServiceArea.countDocuments({ isEnabled: true, 'services.delivery': true }),
      ServiceArea.countDocuments({ isEnabled: false }),
    ])

    return res.json({ success: true, data: areas, summary: { configuredPins, serviceableAreas, nonServiceableAreas: Math.max(0, configuredPins - serviceableAreas), inactiveAreas }, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export function validateArea(body: any): string | null {
  if (!body.city || !String(body.city).trim()) return 'City is required'
  if (!body.state || !String(body.state).trim()) return 'State is required'
  if (!body.pinCodes || !Array.isArray(body.pinCodes) || !body.pinCodes.length) return 'At least one PIN code is required'
  for (const pin of body.pinCodes) {
    if (!/^\d{6}$/.test(String(pin).trim())) return 'Each PIN code must be a valid 6-digit number'
  }
  return null
}

async function findDuplicatePin(pinCodes: string[], excludeId?: string) {
  const query: any = { isEnabled: true, pinCodes: { $in: pinCodes } }
  if (excludeId) query._id = { $ne: excludeId }
  return ServiceArea.findOne(query).select('_id city state pinCodes').lean()
}

// Admin: create a service area.
router.post('/areas', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const validationError = validateArea(req.body)
    if (validationError) return res.status(400).json({ success: false, message: validationError })

    const pinCodes = req.body.pinCodes.map((p: string) => String(p).trim())
    const uniquePins: string[] = [...new Set<string>(pinCodes)]
    const duplicate = await findDuplicatePin(uniquePins)
    if (duplicate) return res.status(409).json({ success: false, message: `PIN code already belongs to ${duplicate.city}, ${duplicate.state}` })
    const area = await ServiceArea.create({
      city: String(req.body.city).trim(),
      state: String(req.body.state).trim(),
      pinCodes: uniquePins,
      isEnabled: req.body.isEnabled !== false,
      services: {
        delivery: req.body.services?.delivery !== false,
        repair: req.body.services?.repair !== false,
        pickupDrop: req.body.services?.pickupDrop !== false,
        sell: req.body.services?.sell !== false,
        exchange: req.body.services?.exchange !== false,
      },
    })

    await writeAudit({ adminId: req.user!.id, action: 'SERVICE_AREA_CREATED', entity: 'ServiceArea', entityId: String(area._id), newValue: serializeAuditValue({ city: area.city, state: area.state, pinCodes: area.pinCodes, services: area.services }), ipAddress: req.ip })

    return res.status(201).json({ success: true, message: 'Service area created', data: area })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin: update a service area.
router.put('/areas/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service area id' })
    const area = await ServiceArea.findById(req.params.id)
    if (!area) return res.status(404).json({ success: false, message: 'Service area not found' })

    const { city, state, pinCodes, isEnabled, services } = req.body
    const before = area.toObject()
    const patch: any = {}
    if (city !== undefined) patch.city = String(city).trim()
    if (state !== undefined) patch.state = String(state).trim()
    if (pinCodes !== undefined) {
      const validationError = validateArea({ ...req.body })
      if (validationError) return res.status(400).json({ success: false, message: validationError })
      patch.pinCodes = [...new Set(pinCodes.map((p: string) => String(p).trim()))]
    }
    if (isEnabled !== undefined) patch.isEnabled = !!isEnabled
    if (services !== undefined) {
      patch.services = {
        delivery: services.delivery !== false,
        repair: services.repair !== false,
        pickupDrop: services.pickupDrop !== false,
        sell: services.sell !== false,
        exchange: services.exchange !== false,
      }
    }

    const willEnable = patch.isEnabled ?? area.isEnabled
    const effectivePins = patch.pinCodes ?? area.pinCodes
    if (willEnable) {
      const duplicate = await findDuplicatePin(effectivePins, String(area._id))
      if (duplicate) return res.status(409).json({ success: false, message: `PIN code already belongs to ${duplicate.city}, ${duplicate.state}` })
    }

    Object.assign(area, patch)
    await area.save()
    const action = !area.isEnabled ? 'SERVICE_AREA_DEACTIVATED' : !before.isEnabled ? 'SERVICE_AREA_REACTIVATED' : 'SERVICE_AREA_UPDATED'
    await writeAudit({ adminId: req.user!.id, action, entity: 'ServiceArea', entityId: String(area._id), oldValue: serializeAuditValue({ isEnabled: before.isEnabled, city: before.city, state: before.state, pinCodes: before.pinCodes, services: before.services }), newValue: serializeAuditValue({ isEnabled: area.isEnabled, city: area.city, state: area.state, pinCodes: area.pinCodes, services: area.services }), ipAddress: req.ip })
    return res.json({ success: true, message: 'Service area updated', data: area })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin: delete a service area.
router.delete('/areas/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service area id' })
    const area = await ServiceArea.findByIdAndUpdate(req.params.id, { $set: { isEnabled: false } }, { new: true })
    if (!area) return res.status(404).json({ success: false, message: 'Service area not found' })
    await writeAudit({ adminId: req.user!.id, action: 'SERVICE_AREA_DEACTIVATED', entity: 'ServiceArea', entityId: String(area._id), newValue: serializeAuditValue({ isEnabled: false }), ipAddress: req.ip })
    return res.json({ success: true, message: 'Service area deactivated', data: area })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Public: register a "notify me when service is available" request.
router.post('/requests', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, alternatePhone, city, state, pincode, requestedService } = req.body

    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' })
    if (!phone || normalizePhone(String(phone)) === null) return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian phone number' })
    if (alternatePhone && normalizePhone(String(alternatePhone)) === null) return res.status(400).json({ success: false, message: 'Alternate phone must be a valid 10-digit Indian phone number' })
    if (!city || !String(city).trim()) return res.status(400).json({ success: false, message: 'City is required' })
    if (!state || !String(state).trim()) return res.status(400).json({ success: false, message: 'State is required' })
    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit PIN code' })
    if (!requestedService || !SERVICE_LABELS.includes(requestedService)) return res.status(400).json({ success: false, message: 'Please select a valid service' })

    const request = await ServiceabilityRequest.create({
      userId: req.user?.id || null,
      name: String(name).trim(),
      phone: normalizePhone(String(phone)),
      alternatePhone: alternatePhone ? normalizePhone(String(alternatePhone)) : undefined,
      city: String(city).trim(),
      state: String(state).trim(),
      pincode: String(pincode).trim(),
      requestedService,
    })

    return res.status(201).json({ success: true, message: 'We will notify you when this service becomes available in your area', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin: list notify-me requests.
router.get('/requests', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { pincode: String(search) },
      ]
    }

    const [requests, total] = await Promise.all([
      ServiceabilityRequest.find(where).populate('userId', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ServiceabilityRequest.countDocuments(where),
    ])

    return res.json({ success: true, data: requests, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Admin: update a notify-me request (mark NOTIFIED / CLOSED, add notes).
router.put('/requests/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNotes, contactedVia } = req.body
    const request = await ServiceabilityRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' })

    if (status !== undefined) {
      if (!['WAITING', 'NOTIFIED', 'CLOSED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' })
      }
      request.status = status
    }
    if (adminNotes !== undefined) request.adminNotes = adminNotes
    if (contactedVia !== undefined) request.contactedVia = contactedVia

    await request.save()
    return res.json({ success: true, message: 'Request updated', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router