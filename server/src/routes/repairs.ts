import { Router, Response } from 'express'
import { RepairBooking, RepairStatusHistory, RepairService } from '../models/repair.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { generateRepairBookingNumber, paginate } from '../utils/helpers'

const router = Router()

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

    if (req.user!.role !== 'ADMIN' && repair.userId._id.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const statusHistory = await RepairStatusHistory.find({ repairId: repair._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: { ...repair.toObject(), statusHistory } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId, brand, model, problemDescription, pickupRequired, pickupAddress, appointmentDate, appointmentTime } = req.body
    if (!brand || !model) return res.status(400).json({ success: false, message: 'Brand and model are required' })

    const bookingNumber = generateRepairBookingNumber()
    const repair = await RepairBooking.create({
      bookingNumber, userId: req.user!.id, serviceId, brand, model, problemDescription,
      pickupRequired, pickupAddress, appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
      appointmentTime,
    })

    await RepairStatusHistory.create({ repairId: repair._id, status: 'BOOKING_RECEIVED', note: 'Booking received' })

    return res.status(201).json({ success: true, message: 'Repair booking created', data: repair })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, technicianName, technicianNotes, estimatedCost, finalCost, note } = req.body
    const repair = await RepairBooking.findById(req.params.id)
    if (!repair) return res.status(404).json({ success: false, message: 'Repair not found' })

    if (status) {
      await RepairStatusHistory.create({ repairId: repair._id, status, note: note || `Status updated to ${status}` })
      repair.status = status
    }
    if (technicianName !== undefined) repair.technicianName = technicianName
    if (technicianNotes !== undefined) repair.technicianNotes = technicianNotes
    if (estimatedCost !== undefined) repair.estimatedCost = estimatedCost
    if (finalCost !== undefined) repair.finalCost = finalCost

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

    await RepairStatusHistory.create({ repairId: repair._id, status, note })
    repair.status = status
    await repair.save()

    return res.json({ success: true, message: 'Status updated', data: repair })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/services', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, startingPrice, estimatedDuration, warranty, compatibleDevices } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' })

    let slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const existing = await RepairService.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const service = await RepairService.create({ name, slug, description, startingPrice, estimatedDuration, warranty, compatibleDevices })
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
