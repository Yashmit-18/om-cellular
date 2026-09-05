import { Router, Response } from 'express'
import { Warranty } from '../models/warranty.model'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'
import { writeAudit } from '../services/audit.service'
import { notify } from '../services/notification.service'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const isAdmin = req.user!.role === 'ADMIN'
    const where: any = isAdmin ? {} : { userId: req.user!.id }
    if (status) where.status = status

    const [warranties, total] = await Promise.all([
      Warranty.find(where).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Warranty.countDocuments(where),
    ])
    return res.json({ success: true, data: warranties, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    console.error('GET /warranties error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/order/:orderId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { orderId: req.params.orderId }
    if (req.user!.role !== 'ADMIN') where.userId = req.user!.id
    const warranties = await Warranty.find(where)
    return res.json({ success: true, data: warranties })
  } catch (error) {
    console.error('GET /warranties/order/:orderId error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const warranty = await Warranty.findById(req.params.id)
    if (!warranty) return res.status(404).json({ success: false, message: 'Warranty not found' })
    const ownerId = warranty.userId ? String((warranty.userId as any)._id || warranty.userId) : ''
    if (req.user!.role !== 'ADMIN' && ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    return res.json({ success: true, data: warranty })
  } catch (error) {
    console.error('GET /warranties/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Customer initiates a warranty claim against an ACTIVE warranty. The claim
// links the warranty to a future repair booking; the repair flow drives the
// resolution. Status moves ACTIVE -> CLAIMED.
router.post('/:id/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const warranty = await Warranty.findById(req.params.id)
    if (!warranty) return res.status(404).json({ success: false, message: 'Warranty not found' })
    const ownerId = warranty.userId ? String((warranty.userId as any)._id || warranty.userId) : ''
    if (req.user!.role !== 'ADMIN' && ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }
    if (warranty.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `This warranty is ${warranty.status.toLowerCase()} and cannot be claimed` })
    }
    if (new Date(warranty.expiresAt).getTime() < Date.now()) {
      warranty.status = 'EXPIRED'
      warranty.statusHistory.push({ status: 'EXPIRED', changedAt: new Date(), changedBy: 'SYSTEM', note: 'Warranty expired before claim' })
      await warranty.save()
      return res.status(400).json({ success: false, message: 'This warranty has expired' })
    }

    const { description } = req.body || {}
    warranty.status = 'CLAIMED'
    warranty.statusHistory.push({ status: 'CLAIMED', changedAt: new Date(), changedBy: 'SYSTEM', note: description ? `Warranty claimed: ${String(description).trim()}` : 'Warranty claimed by customer' })
    await warranty.save()

    await notify({
      userId: req.user!.id,
      type: 'REPAIR',
      title: 'Warranty claim initiated',
      message: `A warranty claim has been registered for ${warranty.variantName || 'your product'} (${warranty.warrantyNumber}). Our service team will contact you to arrange the repair.`,
      metadata: { warrantyId: String(warranty._id), warrantyNumber: warranty.warrantyNumber, entity: 'warranty' },
    })
    await writeAudit({
      adminId: req.user!.id, action: 'WARRANTY_CLAIMED', entity: 'Warranty', entityId: String(warranty._id),
      newValue: JSON.stringify({ warrantyNumber: warranty.warrantyNumber, orderNumber: warranty.orderNumber }),
    })

    return res.json({ success: true, message: 'Warranty claim registered', data: warranty })
  } catch (error) {
    console.error('POST /warranties/:id/claim error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router