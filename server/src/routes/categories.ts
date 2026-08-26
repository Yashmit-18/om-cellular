import { Router, Request, Response } from 'express'
import { Category } from '../models/category.model'
import { Product } from '../models/product.model'
import { requireAdmin } from '../middleware/auth'
import { slugify } from '../utils/helpers'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 })
    const categoriesWithCount = await Promise.all(categories.map(async (c) => {
      const count = await Product.countDocuments({ categoryId: c._id, isActive: true })
      return { ...c.toObject(), _count: { products: count } }
    }))
    return res.json({ success: true, data: categoriesWithCount })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const category = await Category.findOne({ $or: [{ _id: req.params.id }, { slug: req.params.id }] })
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' })
    return res.json({ success: true, data: category })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, image, icon, sortOrder } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' })

    let slug = slugify(name)
    const existing = await Category.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const category = await Category.create({ name, slug, description, image, icon, sortOrder: sortOrder || 0 })
    return res.status(201).json({ success: true, message: 'Category created', data: category })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await Category.findById(req.params.id)
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' })

    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })
    return res.json({ success: true, message: 'Category updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Category deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
