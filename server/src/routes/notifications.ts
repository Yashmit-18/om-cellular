import { Router, Response } from 'express'
import { Notification } from '../models/notification.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'
import { notify, broadcastNotification, NOTIFICATION_TYPES } from '../services/notification.service'
import { writeAudit, serializeAuditValue } from '../services/audit.service'

const router = Router()

function serializeValue(value: unknown): string {
  return serializeAuditValue(value) || ''
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where = { userId: req.user!.id }
    const [notifications, total] = await Promise.all([
      Notification.find(where).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      Notification.countDocuments(where),
    ])

    const unreadCount = await Notification.countDocuments({ ...where, isRead: false })

    return res.json({ success: true, data: notifications, unreadCount, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, audience, type, title, message, metadata } = req.body
    if (!type || !title || !message) return res.status(400).json({ success: false, message: 'type, title, and message are required' })
    if (type && !NOTIFICATION_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid notification type. Allowed: ${NOTIFICATION_TYPES.join(', ')}` })
    }

    // Broadcast to all customers: audience 'all' or a literal userId of 'all'.
    if (audience === 'all' || userId === 'all') {
      const result = await broadcastNotification({ type, title, message, metadata })
      await writeAudit({
        adminId: req.user!.id, action: 'NOTIFICATION_BROADCAST', entity: 'Notification',
        newValue: serializeValue(result.delivered), ipAddress: req.ip,
      })
      return res.status(201).json({ success: true, message: `Announcement sent to ${result.delivered} customers`, data: { delivered: result.delivered } })
    }

    if (!userId) return res.status(400).json({ success: false, message: 'userId is required, or use audience: "all" to broadcast' })

    await notify({ userId, type, title, message, metadata })
    return res.status(201).json({ success: true, message: 'Notification created' })
  } catch (error) {
    console.error('POST /notifications error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user!.id })
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' })

    notification.isRead = true
    await notification.save()
    return res.json({ success: true, message: 'Notification marked as read', data: notification })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true })
    return res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user!.id })
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' })
    return res.json({ success: true, message: 'Notification deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
