import { PhoneValuation } from '../models/phoneValuation.model'
import { PhoneCatalogModel } from '../models/phoneCatalog.model'

export const DEFAULT_VALUATION_ENGINE: {
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

export interface ValuationInput {
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
}

function normalizeStorage(s: string | undefined): string {
  return String(s || '').replace(/\s+/g, '').toUpperCase()
}

// Applies the shared valuation rule engine. The result is the authoritative
// estimate — clients may request it but never supply it.
export function applyValuationRules(input: ValuationInput): number {
  const {
    baseValue, storage, ram, condition, age, displayCondition, batteryCondition, bodyCondition, cameraCondition,
    accessoriesAvailable, originalBill, originalBox,
  } = input
  const storageAdjustment = input.storageAdjustment || {}
  const ramAdjustment = input.ramAdjustment || {}
  const ageDepreciation = input.ageDepreciation || {}
  const conditionMultiplier = input.conditionMultiplier || DEFAULT_VALUATION_ENGINE.conditionMultiplier
  const displayDeduction = input.displayDeduction ?? DEFAULT_VALUATION_ENGINE.displayDeduction
  const batteryDeduction = input.batteryDeduction ?? DEFAULT_VALUATION_ENGINE.batteryDeduction
  const bodyDeduction = input.bodyDeduction ?? DEFAULT_VALUATION_ENGINE.bodyDeduction
  const cameraDeduction = input.cameraDeduction ?? DEFAULT_VALUATION_ENGINE.cameraDeduction
  const accessoryDeduction = input.accessoryDeduction ?? DEFAULT_VALUATION_ENGINE.accessoryDeduction
  const billDeduction = input.billDeduction ?? DEFAULT_VALUATION_ENGINE.billDeduction
  const boxDeduction = input.boxDeduction ?? DEFAULT_VALUATION_ENGINE.boxDeduction

  let estimatedValue = baseValue
  if (storage && Object.keys(storageAdjustment).length > 0) {
    const storageKey = Object.keys(storageAdjustment).find((k) => normalizeStorage(k) === normalizeStorage(storage))
    if (storageKey !== undefined) estimatedValue += Number(storageAdjustment[storageKey]) || 0
  }
  if (ram && Object.keys(ramAdjustment).length > 0) {
    const ramKey = Object.keys(ramAdjustment).find((k) => normalizeStorage(k) === normalizeStorage(ram))
    if (ramKey !== undefined) estimatedValue += Number(ramAdjustment[ramKey]) || 0
  }
  if (age && ageDepreciation[age]) estimatedValue -= Number(ageDepreciation[age]) || 0
  if (age && !ageDepreciation[age]) {
    const pct = DEFAULT_VALUATION_ENGINE.ageDepreciationPct[age]
    if (pct) estimatedValue -= Math.round(baseValue * pct)
  }
  if (condition && conditionMultiplier[condition]) estimatedValue *= Number(conditionMultiplier[condition]) || 1
  if (displayCondition === 'damaged' || displayCondition === 'cracked') estimatedValue -= displayDeduction
  if (batteryCondition === 'poor' || batteryCondition === 'replacement') estimatedValue -= batteryDeduction
  if (bodyCondition === 'damaged' || bodyCondition === 'heavily_damaged') estimatedValue -= bodyDeduction
  if (cameraCondition === 'not_working' || cameraCondition === 'poor') estimatedValue -= cameraDeduction
  if (!accessoriesAvailable) estimatedValue -= accessoryDeduction
  if (!originalBill) estimatedValue -= billDeduction
  if (!originalBox) estimatedValue -= boxDeduction
  return Math.max(0, Math.round(estimatedValue))
}

export interface ValuationResult {
  estimatedValue: number
  brand: string
  model: string
  source: 'phone_valuation' | 'phone_catalog' | 'unavailable'
}

// Computes a server-authoritative valuation for a phone. Resolves the base
// value from the PhoneValuation ruleset first, then falls back to the phone
// catalog storage-variant base values. Returns a zero estimate plus an
// 'unavailable' source when no authoritative base exists so callers can fail
// explicitly instead of inventing a price.
export async function calculateValuation(input: {
  brand: string
  model: string
  storage?: string
  ram?: string
  age?: string
  condition?: string
  displayCondition?: string
  batteryCondition?: string
  bodyCondition?: string
  cameraCondition?: string
  accessoriesAvailable?: boolean
  originalBill?: boolean
  originalBox?: boolean
}): Promise<ValuationResult> {
  const { brand, model } = input

  const valuation = await PhoneValuation.findOne({ brand, model, isActive: true })
  if (valuation) {
    const estimatedValue = applyValuationRules({
      baseValue: valuation.baseValue,
      ...input,
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
    return { estimatedValue, brand: valuation.brand, model: valuation.model, source: 'phone_valuation' }
  }

  const catalog = await PhoneCatalogModel.findOne({ brandName: brand, modelName: model, isActive: true })
  if (!catalog) {
    return { estimatedValue: 0, brand, model, source: 'unavailable' }
  }

  let baseValue = 0
  if (Array.isArray(catalog.storageVariants) && catalog.storageVariants.length > 0) {
    const target = normalizeStorage(input.storage)
    let match = catalog.storageVariants.find((v) => normalizeStorage(v.storage) === target)
    if (!match && input.ram) match = catalog.storageVariants.find((v) => v.ram === input.ram)
    if (!match) match = catalog.storageVariants[0]
    baseValue = Number(match.baseValue) || 0
  }

  const estimatedValue = applyValuationRules({ baseValue, ...input })
  return { estimatedValue, brand: catalog.brandName, model: catalog.modelName, source: 'phone_catalog' }
}