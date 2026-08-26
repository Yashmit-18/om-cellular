import { Router, Request, Response } from 'express'
import { PhoneValuation } from '../models/phoneValuation.model'
import { requireAdmin } from '../middleware/auth'
import { paginate } from '../utils/helpers'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', brand, search } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = { isActive: true }
    if (brand) where.brand = brand
    if (search) where.$or = [{ brand: { $regex: search, $options: 'i' } }, { model: { $regex: search, $options: 'i' } }]

    const [valuations, total] = await Promise.all([
      PhoneValuation.find(where).sort({ brand: 1, model: 1 }).skip(skip).limit(safeLimit),
      PhoneValuation.countDocuments(where),
    ])

    return res.json({ success: true, data: valuations, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox } = req.body
    if (!brand || !model) return res.status(400).json({ success: false, message: 'Brand and model are required' })

    const valuation = await PhoneValuation.findOne({ brand, model, isActive: true })
    if (!valuation) return res.status(404).json({ success: false, message: 'Valuation not available for this phone model' })

    let estimatedValue = valuation.baseValue
    if (storage && valuation.storageAdjustment[storage]) estimatedValue += valuation.storageAdjustment[storage]
    if (ram && valuation.ramAdjustment[ram]) estimatedValue += valuation.ramAdjustment[ram]
    if (age && valuation.ageDepreciation[age]) estimatedValue -= valuation.ageDepreciation[age]
    if (condition && valuation.conditionMultiplier[condition]) estimatedValue *= valuation.conditionMultiplier[condition]
    if (displayCondition === 'damaged' || displayCondition === 'cracked') estimatedValue -= valuation.displayDeduction
    if (batteryCondition === 'poor' || batteryCondition === 'replacement') estimatedValue -= valuation.batteryDeduction
    if (bodyCondition === 'damaged' || bodyCondition === 'heavily_damaged') estimatedValue -= valuation.bodyDeduction
    if (cameraCondition === 'not_working' || cameraCondition === 'poor') estimatedValue -= valuation.cameraDeduction
    if (!accessoriesAvailable) estimatedValue -= valuation.accessoryDeduction
    if (!originalBill) estimatedValue -= valuation.billDeduction
    if (!originalBox) estimatedValue -= valuation.boxDeduction
    estimatedValue = Math.max(0, Math.round(estimatedValue))

    return res.json({ success: true, data: { estimatedValue, brand: valuation.brand, model: valuation.model, disclaimer: 'Estimated value is subject to physical inspection and final verification.' } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const valuation = await PhoneValuation.findById(req.params.id)
    if (!valuation) return res.status(404).json({ success: false, message: 'Valuation not found' })
    return res.json({ success: true, data: valuation })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { brand, model, baseValue, storageAdjustment, ramAdjustment, ageDepreciation, conditionMultiplier, displayDeduction, batteryDeduction, bodyDeduction, cameraDeduction, accessoryDeduction, billDeduction, boxDeduction } = req.body
    if (!brand || !model || baseValue === undefined) return res.status(400).json({ success: false, message: 'Brand, model, and baseValue are required' })

    const existing = await PhoneValuation.findOne({ brand, model })
    if (existing) return res.status(409).json({ success: false, message: 'Valuation already exists for this brand and model' })

    const valuation = await PhoneValuation.create({
      brand, model, baseValue, storageAdjustment, ramAdjustment, ageDepreciation, conditionMultiplier,
      displayDeduction, batteryDeduction, bodyDeduction, cameraDeduction, accessoryDeduction, billDeduction, boxDeduction,
    })

    return res.status(201).json({ success: true, message: 'Valuation created', data: valuation })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const valuation = await PhoneValuation.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!valuation) return res.status(404).json({ success: false, message: 'Valuation not found' })
    return res.json({ success: true, message: 'Valuation updated', data: valuation })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await PhoneValuation.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Valuation deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
