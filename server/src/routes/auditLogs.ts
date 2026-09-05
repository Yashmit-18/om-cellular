import { Router, Response } from 'express'
import { AuditLog } from '../models/auditLog.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', entity, action } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (entity) where.entity = entity
    if (action) where.action = action

    const [logs, total] = await Promise.all([
      AuditLog.find(where).populate('adminId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      AuditLog.countDocuments(where),
    ])

    return res.json({ success: true, data: logs, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { action, entity, entityId, oldValue, newValue, ipAddress } = req.body
    if (!action || !entity) return res.status(400).json({ success: false, message: 'Action and entity are required' })

    const log = await AuditLog.create({
      adminId: req.user!.id, action, entity, entityId, oldValue, newValue, ipAddress,
    })

    return res.status(201).json({ success: true, message: 'Audit log created', data: log })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
