import { Router, Request, Response } from 'express'
import { Brand } from '../models/brand.model'
import { Product } from '../models/product.model'
import { requireAdmin } from '../middleware/auth'
import { slugify } from '../utils/helpers'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ sortOrder: 1 })
    const brandsWithCount = await Promise.all(brands.map(async (b) => {
      const count = await Product.countDocuments({ brandId: b._id, isActive: true })
      return { ...b.toObject(), _count: { products: count } }
    }))
    return res.json({ success: true, data: brandsWithCount })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] })
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' })
    return res.json({ success: true, data: brand })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, logo, sortOrder } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Brand name is required' })

    let slug = slugify(name)
    const existing = await Brand.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const brand = await Brand.create({ name, slug, logo, sortOrder: sortOrder || 0 })
    return res.status(201).json({ success: true, message: 'Brand created', data: brand })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findById(req.params.id)
    if (!brand) return res.status(404).json({ success: false, message: 'Brand not found' })

    const updated = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true })
    return res.json({ success: true, message: 'Brand updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await Brand.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Brand deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
