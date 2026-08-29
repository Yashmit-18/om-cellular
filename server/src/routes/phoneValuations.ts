import { Router, Request, Response } from 'express'
import { PhoneValuation } from '../models/phoneValuation.model'
import { PhoneCatalogModel } from '../models/phoneCatalog.model'
import { requireAdmin } from '../middleware/auth'
import { paginate } from '../utils/helpers'

const router = Router()

const DEFAULT_ENGINE: {
  conditionMultiplier: Record<string, number>
  ageDepreciationPct: Record<string, number>
  displayDeduction: number
  batteryDeduction: number
  bodyDeduction: number
  cameraDeduction: number
  accessoryDeduction: number
  billDeduction: number
  boxDeduction: number
} = {
  conditionMultiplier: { NEW: 1, LIKE_NEW: 0.92, EXCELLENT: 0.88, GOOD: 0.78, FAIR: 0.62, POOR: 0.45 },
  ageDepreciationPct: { less_than_3_months: 0, '3_to_6_months': 0.05, '6_to_12_months': 0.1, '1_to_2_years': 0.18, more_than_2_years: 0.3 },
  displayDeduction: 5000,
  batteryDeduction: 1200,
  bodyDeduction: 1800,
  cameraDeduction: 900,
  accessoryDeduction: 500,
  billDeduction: 0,
  boxDeduction: 300,
}

function normalizeStorage(s: string | undefined): string {
  return String(s || '').replace(/\s+/g, '').toUpperCase()
}

function applyRules(input: {
  baseValue: number
  storage?: string
  ram?: string
  condition?: string
  age?: string
  displayCondition?: string
  batteryCondition?: string
  bodyCondition?: string
  cameraCondition?: string
  accessoriesAvailable?: boolean
  originalBill?: boolean
  originalBox?: boolean
  storageAdjustment?: Record<string, number>
  ramAdjustment?: Record<string, number>
  ageDepreciation?: Record<string, number>
  conditionMultiplier?: Record<string, number>
  displayDeduction?: number
  batteryDeduction?: number
  bodyDeduction?: number
  cameraDeduction?: number
  accessoryDeduction?: number
  billDeduction?: number
  boxDeduction?: number
}) {
  const {
    baseValue, storage, ram, condition, age, displayCondition, batteryCondition, bodyCondition, cameraCondition,
    accessoriesAvailable, originalBill, originalBox,
  } = input
  const storageAdjustment = input.storageAdjustment || {}
  const ramAdjustment = input.ramAdjustment || {}
  const ageDepreciation = input.ageDepreciation || {}
  const conditionMultiplier = input.conditionMultiplier || DEFAULT_ENGINE.conditionMultiplier
  const displayDeduction = input.displayDeduction ?? DEFAULT_ENGINE.displayDeduction
  const batteryDeduction = input.batteryDeduction ?? DEFAULT_ENGINE.batteryDeduction
  const bodyDeduction = input.bodyDeduction ?? DEFAULT_ENGINE.bodyDeduction
  const cameraDeduction = input.cameraDeduction ?? DEFAULT_ENGINE.cameraDeduction
  const accessoryDeduction = input.accessoryDeduction ?? DEFAULT_ENGINE.accessoryDeduction
  const billDeduction = input.billDeduction ?? DEFAULT_ENGINE.billDeduction
  const boxDeduction = input.boxDeduction ?? DEFAULT_ENGINE.boxDeduction

  let estimatedValue = baseValue
  if (storage && Object.keys(storageAdjustment).length > 0) {
    const storageKey = Object.keys(storageAdjustment).find(k => normalizeStorage(k) === normalizeStorage(storage))
    if (storageKey !== undefined) estimatedValue += Number(storageAdjustment[storageKey]) || 0
  }
  if (ram && Object.keys(ramAdjustment).length > 0) {
    const ramKey = Object.keys(ramAdjustment).find(k => normalizeStorage(k) === normalizeStorage(ram))
    if (ramKey !== undefined) estimatedValue += Number(ramAdjustment[ramKey]) || 0
  }
  if (age && ageDepreciation[age]) estimatedValue -= ageDepreciation[age]
  if (age && !ageDepreciation[age]) {
    const pct = DEFAULT_ENGINE.ageDepreciationPct[age]
    if (pct) estimatedValue -= Math.round(baseValue * pct)
  }
  if (condition && conditionMultiplier[condition]) estimatedValue *= conditionMultiplier[condition]
  if (displayCondition === 'damaged' || displayCondition === 'cracked') estimatedValue -= displayDeduction
  if (batteryCondition === 'poor' || batteryCondition === 'replacement') estimatedValue -= batteryDeduction
  if (bodyCondition === 'damaged' || bodyCondition === 'heavily_damaged') estimatedValue -= bodyDeduction
  if (cameraCondition === 'not_working' || cameraCondition === 'poor') estimatedValue -= cameraDeduction
  if (!accessoriesAvailable) estimatedValue -= accessoryDeduction
  if (!originalBill) estimatedValue -= billDeduction
  if (!originalBox) estimatedValue -= boxDeduction
  return Math.max(0, Math.round(estimatedValue))
}

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

    if (valuation) {
      const estimatedValue = applyRules({
        baseValue: valuation.baseValue,
        storage,
        ram,
        age,
        condition,
        displayCondition,
        batteryCondition,
        bodyCondition,
        cameraCondition,
        accessoriesAvailable,
        originalBill,
        originalBox,
        storageAdjustment: valuation.storageAdjustment,
        ramAdjustment: valuation.ramAdjustment,
        ageDepreciation: valuation.ageDepreciation,
        conditionMultiplier: valuation.conditionMultiplier,
        displayDeduction: valuation.displayDeduction,
        batteryDeduction: valuation.batteryDeduction,
        bodyDeduction: valuation.bodyDeduction,
        cameraDeduction: valuation.cameraDeduction,
        accessoryDeduction: valuation.accessoryDeduction,
        billDeduction: valuation.billDeduction,
        boxDeduction: valuation.boxDeduction,
      })
      return res.json({ success: true, data: { estimatedValue, brand: valuation.brand, model: valuation.model, disclaimer: 'Estimated value is subject to physical inspection and final verification.' } })
    }

    // Fallback pricing engine: derive from the phone catalog base values.
    const catalog = await PhoneCatalogModel.findOne({ brandName: brand, modelName: model, isActive: true })
    if (!catalog) return res.status(404).json({ success: false, message: 'Valuation not available for this phone model' })

    let baseValue = 0
    if (Array.isArray(catalog.storageVariants) && catalog.storageVariants.length > 0) {
      const target = normalizeStorage(storage)
      let match = catalog.storageVariants.find(v => normalizeStorage(v.storage) === target)
      if (!match && ram) match = catalog.storageVariants.find(v => v.ram === ram)
      if (!match) match = catalog.storageVariants[0]
      baseValue = Number(match.baseValue) || 0
    }

    const estimatedValue = applyRules({
      baseValue,
      storage,
      ram,
      age,
      condition,
      displayCondition,
      batteryCondition,
      bodyCondition,
      cameraCondition,
      accessoriesAvailable,
      originalBill,
      originalBox,
    })

    return res.json({
      success: true,
      data: { estimatedValue, brand: catalog.brandName, model: catalog.modelName, disclaimer: 'Estimated value is subject to physical inspection and final verification.' },
    })
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
