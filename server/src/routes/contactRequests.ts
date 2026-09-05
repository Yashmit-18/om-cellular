import { Router, Response } from 'express'
import { ContactRequest } from '../models/contactRequest.model'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', status, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = {}
    if (status) where.status = status
    if (search) where.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ]

    const [requests, total] = await Promise.all([
      ContactRequest.find(where).populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      ContactRequest.countDocuments(where),
    ])

    return res.json({ success: true, data: requests, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email, and message are required' })

    const userId = req.user?.id || null
    const contact = await ContactRequest.create({ userId, name, email, phone, subject, message })

    return res.status(201).json({ success: true, message: 'Contact request submitted', data: contact })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNotes } = req.body
    const request = await ContactRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Contact request not found' })

    if (status) request.status = status
    if (adminNotes !== undefined) request.adminNotes = adminNotes

    await request.save()
    return res.json({ success: true, message: 'Contact request updated', data: request })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ContactRequest.findByIdAndDelete(req.params.id)
    return res.json({ success: true, message: 'Contact request deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
