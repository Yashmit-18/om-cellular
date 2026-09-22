import mongoose from 'mongoose'
import { paginate } from '../utils/helpers'

// Pure, DB-free query parsing + aggregation-shape helpers for GET /products.
// Kept side-effect free so node:test can exercise every branch without Mongo.

export type ProductSortKey = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'discount' | 'rating'

// Products can never accumulate a real rating — reviews here are user feedback on
// variants (Review model), not a persisted product-rating rollup. So `rating` was
// a fake sort (constant product.rating=0 → identical to `newest`). Removed from the
// contract so the UI can't offer a sort box that silently does nothing.
export const PRODUCT_SORT_KEYS: ProductSortKey[] = ['newest', 'name', 'price_asc', 'price_desc', 'discount', 'rating']

// Guards against absurd client-supplied bounds that would poison the index scan.
export const MAX_PRICE = 10_000_000

export interface ParsedProductQuery {
  page: number
  limit: number
  search: string
  ids: string[]
  brandIds: string[]
  categoryIds: string[]
  conditions: string[]
  storages: string[]
  rams: string[]
  colors: string[]
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean
  discount: boolean
  isFeatured: boolean
  isRefurbished: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  includeInactive: boolean
  sort: ProductSortKey
  invalidBrand: boolean
  invalidCategory: boolean
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeSearchTerm(value: unknown): string {
  return escapeRegex(String(value || '').trim().replace(/\s+/g, ' '))
}

// Accepts "a,b , c" / ["a","b"] / "a" and returns a trimmed, de-duped list.
export function parseMultiParam(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  const parts = Array.isArray(raw) ? raw : String(raw).split(',')
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    if (part === undefined || part === null) continue
    const value = String(part).trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

export function isTruthyParam(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === '1'
}

export function parseNumberParam(raw: unknown, opts: { min?: number; max?: number } = {}): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  let out = value
  if (opts.min !== undefined) out = Math.max(opts.min, out)
  if (opts.max !== undefined) out = Math.min(opts.max, out)
  return out
}

export function normalizeSort(raw: unknown): ProductSortKey {
  const value = String(raw || '')
  return (PRODUCT_SORT_KEYS as string[]).includes(value) ? (value as ProductSortKey) : 'newest'
}

export function parseProductQuery(query: Record<string, any>, opts: { isAdmin?: boolean } = {}): ParsedProductQuery {
  const { page, limit } = paginate(parseInt(String(query.page ?? '1'), 10), parseInt(String(query.limit ?? '20'), 10))

  const brandTokens = parseMultiParam(query.brand ?? query.brandId)
  const categoryTokens = parseMultiParam(query.category ?? query.categoryId)
  const brandIds = brandTokens.filter(token => mongoose.Types.ObjectId.isValid(token))
  const categoryIds = categoryTokens.filter(token => mongoose.Types.ObjectId.isValid(token))
  const idsText = parseMultiParam(query.ids)
  const ids = idsText.filter(token => mongoose.Types.ObjectId.isValid(token))

  let minPrice = parseNumberParam(query.minPrice, { min: 0, max: MAX_PRICE })
  let maxPrice = parseNumberParam(query.maxPrice, { min: 0, max: MAX_PRICE })
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }

  return {
    page,
    limit,
    search: normalizeSearchTerm(query.search ?? query.query),
    ids,
    brandIds,
    categoryIds,
    conditions: parseMultiParam(query.condition),
    storages: parseMultiParam(query.storage),
    rams: parseMultiParam(query.ram),
    colors: parseMultiParam(query.color),
    minPrice,
    maxPrice,
    inStock: isTruthyParam(query.inStock),
    discount: isTruthyParam(query.discount),
    isFeatured: isTruthyParam(query.isFeatured),
    isRefurbished: isTruthyParam(query.isRefurbished),
    isNewArrival: isTruthyParam(query.isNewArrival),
    isBestSeller: isTruthyParam(query.isBestSeller),
    includeInactive: isTruthyParam(query.includeAll) && !!opts.isAdmin,
    sort: normalizeSort(query.sort),
    invalidBrand: brandTokens.length !== brandIds.length,
    invalidCategory: categoryTokens.length !== categoryIds.length,
  }
}

export function buildProductMatch(parsed: ParsedProductQuery): Record<string, any> {
  const match: any = parsed.includeInactive ? {} : { isActive: true }
  if (parsed.search) {
    match.$or = [
      { name: { $regex: parsed.search, $options: 'i' } },
      { description: { $regex: parsed.search, $options: 'i' } },
      { slug: { $regex: parsed.search, $options: 'i' } },
    ]
  }
  if (parsed.brandIds.length) match.brandId = { $in: parsed.brandIds.map(id => new mongoose.Types.ObjectId(id)) }
  if (parsed.categoryIds.length) match.categoryId = { $in: parsed.categoryIds.map(id => new mongoose.Types.ObjectId(id)) }
  if (parsed.ids.length) match._id = { $in: parsed.ids.map(id => new mongoose.Types.ObjectId(id)) }
  if (parsed.isFeatured) match.isFeatured = true
  if (parsed.isRefurbished) match.isRefurbished = true
  if (parsed.isNewArrival) match.isNewArrival = true
  if (parsed.isBestSeller) match.isBestSeller = true
  return match
}

// Aggregation expression evaluated inside a $filter over the looked-up variants
// (alias `$$v`). Returns null when no variant-level constraint is active so the
// pipeline can skip the $filter/$match entirely.
export function buildVariantAttrCondition(parsed: ParsedProductQuery): any | null {
  const and: any[] = []
  if (parsed.storages.length) and.push({ $in: ['$$v.storage', parsed.storages] })
  if (parsed.rams.length) and.push({ $in: ['$$v.ram', parsed.rams] })
  if (parsed.colors.length) and.push({ $in: ['$$v.color', parsed.colors] })
  if (parsed.conditions.length) and.push({ $in: ['$$v.condition', parsed.conditions] })
  if (!and.length) return null
  return and.length === 1 ? and[0] : { $and: and }
}

export function buildPostLookupMatch(parsed: ParsedProductQuery): Record<string, any> {
  const match: any = {}
  const hasAttr = parsed.storages.length > 0 || parsed.rams.length > 0 || parsed.colors.length > 0
  if (hasAttr) match['_matchedVariants.0'] = { $exists: true }
  if (parsed.conditions.length && !hasAttr) {
    // Product-level condition OR any active variant at that condition.
    match.$or = [{ condition: { $in: parsed.conditions } }, { '_matchedVariants.0': { $exists: true } }]
  }
  if (parsed.inStock) {
    if (hasAttr) {
      // When attribute filters are active, in-stock must be scoped to the
      // *matched* variant (a 256GB variant, for example), not to any variant.
      // `_matchedInStock` is an array so `.0` only exists when the matched
      // variant is actually in stock.
      match['_matchedInStock.0'] = { $exists: true }
    } else {
      match.inStock = true
    }
  }
  if (parsed.discount) match.maxDiscount = { $gt: 0 }
  const priceRange: any = {}
  if (parsed.minPrice !== null) priceRange.$gte = parsed.minPrice
  if (parsed.maxPrice !== null) priceRange.$lte = parsed.maxPrice
  if (Object.keys(priceRange).length) match.lowestPrice = priceRange
  return match
}

export function buildSortDoc(sort: ProductSortKey): Record<string, 1 | -1> {
  switch (sort) {
    case 'name':
      return { name: 1 }
    case 'price_asc':
      return { lowestPrice: 1, createdAt: -1 }
    case 'price_desc':
      return { lowestPrice: -1, createdAt: -1 }
    case 'discount':
      return { maxDiscount: -1, createdAt: -1 }
    case 'rating':
      return { ratingCount: -1, rating: -1, createdAt: -1 }
    default:
      return { createdAt: -1 }
  }
}

export function cleanStringValues(values: unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

export function storageRank(value: string): number {
  const match = /(\d+(?:\.\d+)?)\s*(tb|gb|mb)/i.exec(value)
  if (!match) return Number.MAX_SAFE_INTEGER
  const amount = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  const multiplier = unit === 'tb' ? 1024 : unit === 'mb' ? 1 / 1024 : 1
  return amount * multiplier
}

export function sortStorageValues(values: string[]): string[] {
  return [...values].sort((a, b) => storageRank(a) - storageRank(b) || a.localeCompare(b))
}
