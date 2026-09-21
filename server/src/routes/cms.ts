import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Banner, HomepageSection, InformationCard, Testimonial, FAQ } from '../models/cms.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest, AuthUser } from '../types'
import { env } from '../config/env'

function createCmsRouter(model: any, displayName: string, publicFilter?: Record<string, any>) {
  const router = Router()

  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      const includeAll = req.query.includeAll === 'true'
      if (includeAll) {
        const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '')
        if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' })
        let decoded: AuthUser
        try {
          decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser
        } catch {
          return res.status(401).json({ success: false, message: 'Invalid or expired token' })
        }
        if (decoded.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' })
      }
      const items = await model.find(includeAll ? {} : (publicFilter || { isActive: true })).sort({ sortOrder: 1 })
      return res.json({ success: true, data: items })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await model.findById(req.params.id)
      if (!item) return res.status(404).json({ success: false, message: `${displayName} not found` })
      return res.json({ success: true, data: item })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })

  router.post('/', requireAdmin, async (req: Request, res: Response) => {
    try {
      const item = await model.create(req.body)
      return res.status(201).json({ success: true, message: `${displayName} created`, data: item })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })

  router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const item = await model.findByIdAndUpdate(req.params.id, req.body, { new: true })
      if (!item) return res.status(404).json({ success: false, message: `${displayName} not found` })
      return res.json({ success: true, message: `${displayName} updated`, data: item })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })

  router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      await model.findByIdAndUpdate(req.params.id, { isActive: false })
      return res.json({ success: true, message: `${displayName} deactivated` })
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })

  return router
}

const now = new Date()
const bannerPublicFilter = {
  isActive: true,
  $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
    { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
  ],
}
const bannerRouter = createCmsRouter(Banner, 'Banner', bannerPublicFilter)
const homepageSectionRouter = createCmsRouter(HomepageSection, 'Homepage Section')
const informationCardRouter = createCmsRouter(InformationCard, 'Information Card')
const testimonialRouter = createCmsRouter(Testimonial, 'Testimonial')
const faqRouter = createCmsRouter(FAQ, 'FAQ')

export const banners = bannerRouter
export const homepageSections = homepageSectionRouter
export const informationCards = informationCardRouter
export const testimonials = testimonialRouter
export const faqs = faqRouter

export default { banners, homepageSections, informationCards, testimonials, faqs }
