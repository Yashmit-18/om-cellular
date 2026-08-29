import { Router, Request, Response } from 'express'
import { PhoneCatalogModel } from '../models/phoneCatalog.model'
import { requireAdmin } from '../middleware/auth'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { brand, search } = req.query
    const where: any = { isActive: true }
    if (brand) where.brandName = brand
    if (search) where.$or = [
      { brandName: { $regex: search, $options: 'i' } },
      { modelName: { $regex: search, $options: 'i' } },
    ]
    const models = await PhoneCatalogModel.find(where).sort({ brandName: 1, sortOrder: 1, modelName: 1 })
    return res.json({ success: true, data: models })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/brands', async (_req: Request, res: Response) => {
  try {
    const brands = await PhoneCatalogModel.distinct('brandName', { isActive: true })
    return res.json({ success: true, data: brands.sort() })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/models/:brand', async (req: Request, res: Response) => {
  try {
    const models = await PhoneCatalogModel.find({ brandName: req.params.brand, isActive: true }).sort({ sortOrder: 1, modelName: 1 })
    return res.json({ success: true, data: models })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/admin/all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', brand, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))
    const where: any = {}
    if (brand) where.brandName = brand
    if (search) where.$or = [
      { brandName: { $regex: search, $options: 'i' } },
      { modelName: { $regex: search, $options: 'i' } },
    ]
    const [models, total] = await Promise.all([
      PhoneCatalogModel.find(where).sort({ brandName: 1, modelName: 1 }).skip(skip).limit(safeLimit),
      PhoneCatalogModel.countDocuments(where),
    ])
    return res.json({ success: true, data: models, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { brandName, modelName, image, storageVariants, sortOrder } = req.body
    if (!brandName || !modelName) return res.status(400).json({ success: false, message: 'Brand name and model name are required' })
    let slug = `${brandName}-${modelName}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const existing = await PhoneCatalogModel.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`
    const model = await PhoneCatalogModel.create({ brandName, modelName, slug, image: image || undefined, storageVariants: storageVariants || [], sortOrder: sortOrder || 0 })
    return res.status(201).json({ success: true, message: 'Phone model created', data: model })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const model = await PhoneCatalogModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!model) return res.status(404).json({ success: false, message: 'Phone model not found' })
    return res.json({ success: true, message: 'Phone model updated', data: model })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await PhoneCatalogModel.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Phone model deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Normalize storage variants that may arrive either as plain strings:
//   ["128GB", "256GB"]
// or as objects:
//   [{ storage: "128GB", ram: "8GB", baseValue: 10000 }]
// String-only entries get a default baseValue of 0 so they don't fail schema validation.
const normalizeStorageVariants = (variants: any): Array<{ storage: string; ram: string; baseValue: number }> => {
  if (!Array.isArray(variants)) return []
  return variants.map((v: any) => {
    if (typeof v === 'string') {
      return { storage: v.trim(), ram: '', baseValue: 0 }
    }
    return {
      storage: String(v.storage || '').trim(),
      ram: String(v.ram || '').trim(),
      baseValue: Number(v.baseValue) || 0,
    }
  }).filter(v => v.storage)
}

router.post('/seed', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phones } = req.body
    if (!phones || !Array.isArray(phones)) return res.status(400).json({ success: false, message: 'Phones array is required' })
    let created = 0
    let skipped = 0
    for (const phone of phones) {
      if (!phone.brandName || !phone.modelName) continue
      const slug = `${phone.brandName}-${phone.modelName}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const existing = await PhoneCatalogModel.findOne({ slug })
      if (existing) { skipped++; continue }
      await PhoneCatalogModel.create({
        brandName: phone.brandName,
        modelName: phone.modelName,
        slug,
        image: phone.image || undefined,
        storageVariants: normalizeStorageVariants(phone.storageVariants),
        sortOrder: Number(phone.sortOrder) || 0,
        isActive: true,
      })
      created++
    }
    // Restore any previously deactivated models that exist again in this seed list
    let reactivated = 0
    for (const phone of phones) {
      if (!phone.brandName || !phone.modelName) continue
      const slug = `${phone.brandName}-${phone.modelName}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const existing = await PhoneCatalogModel.findOne({ slug, isActive: false })
      if (existing) {
        await PhoneCatalogModel.updateOne({ slug }, { $set: { isActive: true } })
        reactivated++
      }
    }
    return res.json({ success: true, message: `Seeded: ${created} created, ${skipped} skipped, ${reactivated} reactivated`, data: { created, skipped, reactivated } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
