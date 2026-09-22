// Category-aware spec resolution for the comparison table. Lives in its own
// module so the table stays declarative and the "which rows appear per
// category" rules are easy to test / adjust. Uses only real catalogue fields
// (product + variant + specifications) — nothing fabricated.
import { formatPrice, getConditionLabel } from '../index'
import type { ProductVariant, ProductWithVariant } from '../../types'

export type CategoryGroup = 'phones' | 'tablets' | 'watches' | 'accessories'

export interface CompareFieldRow {
  key: string
  section: string
  label: string
  values: (string | null)[] // one entry per compared product, aligned by index
}

export interface CompareSection {
  name: string
  rows: CompareFieldRow[]
}

export function categoryGroupOf(categoryName?: string | null): CategoryGroup {
  const name = (categoryName || '').toLowerCase()
  if (name.includes('tablet')) return 'tablets'
  if (name.includes('watch')) return 'watches'
  if (name.includes('accessor')) return 'accessories'
  return 'phones'
}

// Parses a variant's `specifications` (array of {key, value} | "Key: value"
// strings | object) into a case-insensitive first-wins map.
function specMapOf(raw: unknown): Record<string, string> {
  const map: Record<string, string> = {}
  let specs = raw
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs) } catch { return map }
  }
  const push = (key: unknown, value: unknown) => {
    const k = String(key || '').trim().toLowerCase()
    const v = String(value ?? '').trim()
    if (k && v && !(k in map)) map[k] = v
  }
  if (Array.isArray(specs)) {
    for (const item of specs) {
      if (item && typeof item === 'object') {
        const entry = item as Record<string, unknown>
        push(entry.key ?? entry.name ?? entry.label, entry.value ?? entry.description ?? '')
      } else if (typeof item === 'string' && item.includes(':')) {
        const idx = item.indexOf(':')
        push(item.slice(0, idx), item.slice(idx + 1))
      }
    }
  } else if (specs && typeof specs === 'object') {
    for (const [key, value] of Object.entries(specs as Record<string, unknown>)) push(key, value)
  }
  return map
}

function firstSpec(variants: ProductVariant[], keys: string[]): string | null {
  for (const variant of variants) {
    const map = specMapOf(variant.specifications)
    for (const key of keys) {
      const value = map[key.toLowerCase()]
      if (value) return value
    }
  }
  return null
}

function distinctVariantValues(variants: ProductVariant[], field: keyof ProductVariant): string[] {
  const seen = new Set<string>()
  for (const variant of variants) {
    const value = variant?.[field]
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      seen.add(String(value).trim())
    }
  }
  return Array.from(seen)
}

function joinOrNull(values: string[], sep = ' · '): string | null {
  return values.length > 0 ? values.join(sep) : null
}

function effectivePrice(variant: ProductVariant): number {
  const price = Number(variant.price) || 0
  const discountPrice = variant.discountPrice != null ? Number(variant.discountPrice) : null
  return discountPrice !== null && discountPrice < price ? discountPrice : price
}

function priceLabel(product: ProductWithVariant): string | null {
  const variants = (product.variants || []).filter(v => v.isActive !== false)
  if (variants.length === 0) return null
  const prices = variants.map(effectivePrice)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === 0 && max === 0) return null
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`
}

function stockLabel(product: ProductWithVariant): string | null {
  const variants = product.variants || []
  if (variants.length === 0) return null
  const total = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
  return total > 0 ? `${total} available` : 'Out of stock'
}

function conditionLabel(product: ProductWithVariant): string | null {
  const conditions = Array.from(new Set(
    (product.variants || [])
      .map(v => v.condition)
      .filter((c): c is string => Boolean(c)),
  ))
  if (conditions.length === 0 && product.condition) conditions.push(String(product.condition))
  if (conditions.length === 0) return null
  return conditions.map(getConditionLabel).join(' / ')
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Accessories: surface spec keys that aren't already dedicated rows, capped so
// the cell stays readable.
const ACCESSORY_BASE_KEYS = new Set(['warranty', 'connectivity', 'compatibility', 'size'])
function accessoryKeySpecs(product: ProductWithVariant): string[] {
  const out: string[] = []
  for (const variant of product.variants || []) {
    const map = specMapOf(variant.specifications)
    for (const [key, value] of Object.entries(map)) {
      if (ACCESSORY_BASE_KEYS.has(key)) continue
      out.push(`${titleCase(key)}: ${value}`)
      if (out.length >= 6) return out
    }
    if (out.length >= 6) return out
  }
  return out
}

type Resolver = (product: ProductWithVariant) => string | null

interface RowSpec {
  key: string
  section: string
  label: string
  groups?: CategoryGroup[]
  resolve: Resolver
}

const ROW_SPECS: RowSpec[] = [
  // Overview
  { key: 'brand', section: 'Overview', label: 'Brand', resolve: p => p.brand?.name ?? null },
  { key: 'model', section: 'Overview', label: 'Model', resolve: p => p.name ?? null },
  { key: 'condition', section: 'Overview', label: 'Condition', resolve: conditionLabel },
  { key: 'color', section: 'Overview', label: 'Colour', resolve: p => joinOrNull(distinctVariantValues(p.variants || [], 'color')) },
  { key: 'warranty', section: 'Overview', label: 'Warranty', resolve: p => p.warranty || firstSpec(p.variants || [], ['warranty']) },
  { key: 'stock', section: 'Overview', label: 'Stock', resolve: stockLabel },

  // Pricing
  { key: 'price', section: 'Pricing', label: 'Price', resolve: priceLabel },

  // Hardware (phones + tablets)
  { key: 'storage', section: 'Hardware', label: 'Storage', groups: ['phones', 'tablets'], resolve: p => joinOrNull(distinctVariantValues(p.variants || [], 'storage')) },
  { key: 'ram', section: 'Hardware', label: 'RAM', groups: ['phones', 'tablets'], resolve: p => joinOrNull(distinctVariantValues(p.variants || [], 'ram')) },
  { key: 'processor', section: 'Hardware', label: 'Processor', groups: ['phones', 'tablets'], resolve: p => firstSpec(p.variants || [], ['processor']) },
  { key: 'connectivity', section: 'Hardware', label: 'Connectivity', groups: ['phones', 'tablets', 'watches'], resolve: p => firstSpec(p.variants || [], ['connectivity']) },

  // Display
  { key: 'display', section: 'Display', label: 'Display', groups: ['phones', 'tablets', 'watches'], resolve: p => firstSpec(p.variants || [], ['display']) },
  { key: 'caseSize', section: 'Display', label: 'Case / Screen Size', groups: ['watches'], resolve: p => firstSpec(p.variants || [], ['size', 'screen size']) },

  // Camera
  { key: 'camera', section: 'Camera', label: 'Camera', groups: ['phones', 'tablets'], resolve: p => firstSpec(p.variants || [], ['camera', 'main camera', 'rear camera']) },

  // Battery
  { key: 'battery', section: 'Battery', label: 'Battery', groups: ['phones', 'tablets', 'watches'], resolve: p => firstSpec(p.variants || [], ['battery']) },

  // Software
  { key: 'os', section: 'Software', label: 'Operating System', resolve: p => firstSpec(p.variants || [], ['operating system', 'os']) },

  // Other
  { key: 'waterResistance', section: 'Other', label: 'Water Resistance', groups: ['watches'], resolve: p => firstSpec(p.variants || [], ['water resistance']) },
  { key: 'sensors', section: 'Other', label: 'Sensors', groups: ['watches'], resolve: p => firstSpec(p.variants || [], ['sensors']) },
  { key: 'compatibility', section: 'Other', label: 'Compatibility', groups: ['accessories'], resolve: p => firstSpec(p.variants || [], ['compatibility']) },
  { key: 'keySpecs', section: 'Other', label: 'Key specifications', groups: ['accessories'], resolve: p => joinOrNull(accessoryKeySpecs(p), ' · ') },
]

// Builds the grouped spec table for a compare page. Rows that resolve to empty
// for every compared product are omitted so half-empty tables never render.
export function buildCompareSections(products: ProductWithVariant[]): CompareSection[] {
  const group = categoryGroupOf(products[0]?.category?.name)
  const sections = new Map<string, CompareFieldRow[]>()

  for (const spec of ROW_SPECS) {
    if (spec.groups && !spec.groups.includes(group)) continue
    const values = products.map(product => spec.resolve(product))
    if (!values.some(Boolean)) continue
    const rows = sections.get(spec.section) || []
    rows.push({ key: spec.key, section: spec.section, label: spec.label, values })
    sections.set(spec.section, rows)
  }

  return Array.from(sections.entries()).map(([name, rows]) => ({ name, rows }))
}