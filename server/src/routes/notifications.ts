import { Router, Response } from 'express'
import { Notification } from '../models/notification.model'
import { authenticate, requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'

const router = Router()

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
    const { userId, type, title, message, metadata } = req.body
    if (!userId || !type || !title || !message) return res.status(400).json({ success: false, message: 'userId, type, title, and message are required' })

    const notification = await Notification.create({ userId, type, title, message, metadata })
    return res.status(201).json({ success: true, message: 'Notification created', data: notification })
  } catch (error) {
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
