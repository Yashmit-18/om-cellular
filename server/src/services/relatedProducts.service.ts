// Pure, deterministic "related products" recommendation logic. There is no
// behavioural recommendation engine (no purchases/biography sims), so this
// uses honest catalogue similarity only: same category, same brand, similar
// price, matching storage/RAM. No Math.random(), no fabricated popularity.
// Kept side-effect free so node:test can exercise every rule without Mongo.

export interface RelatedCandidate {
  id: string
  name?: string
  categoryId?: string | null
  brandId?: string | null
  isFeatured?: boolean
  lowestPrice?: number
  storageValues?: string[]
  ramValues?: string[]
}

export interface RelatedContext {
  id: string
  categoryId?: string | null
  brandId?: string | null
  lowestPrice?: number
  storageValues?: string[]
  ramValues?: string[]
  // Fractional price band used by the "similar price" rule (default 0.15).
  priceBandRatio?: number
}

export const RELATED_PRICE_BAND_RATIO = 0.15

export const RELATED_SCORES = {
  sameCategory: 100,
  sameBrand: 50,
  similarPrice: 30,
  matchingStorage: 15,
  matchingRam: 15,
  featured: 5,
}

function firstPrice(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function hasSimilarPrice(currentLow: number | null | undefined, candidateLow: number | null | undefined, ratio = RELATED_PRICE_BAND_RATIO): boolean {
  const a = firstPrice(currentLow)
  const b = firstPrice(candidateLow)
  if (a === null || b === null) return false
  const band = Math.max(a, b) * ratio
  return Math.abs(a - b) <= band
}

function sharesAny(current: string[] = [], candidate: string[] = []): boolean {
  if (current.length === 0 || candidate.length === 0) return false
  const seen = new Set(current.map(v => String(v || '').trim().toLowerCase()).filter(Boolean))
  return candidate.some(v => {
    const key = String(v || '').trim().toLowerCase()
    return key !== '' && seen.has(key)
  })
}

export function sharesAttribute(current: string[] = [], candidate: string[] = []): boolean {
  return sharesAny(current, candidate)
}

export function sameCategoryId(a: RelatedContext, b: RelatedCandidate): boolean {
  return Boolean(a.categoryId) && a.categoryId === b.categoryId
}

export function sameBrandId(a: RelatedContext, b: RelatedCandidate): boolean {
  return Boolean(a.brandId) && a.brandId === b.brandId
}

// Deterministic similarity score between a candidate and the current product.
// Excludes the current product. Score ties are broken downstream with stable
// secondary ordering (see rankRelatedProducts).
export function scoreRelated(candidate: RelatedCandidate, context: RelatedContext): number {
  if (!candidate || candidate.id === context.id) return -Number.MAX_SAFE_INTEGER

  let score = 0
  if (sameCategoryId(context, candidate)) score += RELATED_SCORES.sameCategory
  if (sameBrandId(context, candidate)) score += RELATED_SCORES.sameBrand
  if (hasSimilarPrice(context.lowestPrice, candidate.lowestPrice, context.priceBandRatio)) score += RELATED_SCORES.similarPrice
  if (sharesAttribute(context.storageValues, candidate.storageValues)) score += RELATED_SCORES.matchingStorage
  if (sharesAttribute(context.ramValues, candidate.ramValues)) score += RELATED_SCORES.matchingRam
  if (candidate.isFeatured) score += RELATED_SCORES.featured
  return score
}

// Filters out the current product, sorts deterministically by similarity score
// (score desc, then category/brand match, then name asc as a stable tiebreak)
// and caps the result at `limit`.
export function rankRelatedProducts(candidates: RelatedCandidate[], context: RelatedContext, limit: number): RelatedCandidate[] {
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 6, 1), 8)

  const scored = candidates
    .map(cand => ({ cand, score: scoreRelated(cand, context) }))
    .filter(item => item.score > Number.MIN_SAFE_INTEGER && item.cand.id !== context.id)

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const aCat = sameCategoryId(context, a.cand) ? 1 : 0
    const bCat = sameCategoryId(context, b.cand) ? 1 : 0
    if (bCat !== aCat) return bCat - aCat
    const aBrand = sameBrandId(context, a.cand) ? 1 : 0
    const bBrand = sameBrandId(context, b.cand) ? 1 : 0
    if (bBrand !== aBrand) return bBrand - aBrand
    return String(a.cand.name || '').localeCompare(String(b.cand.name || ''))
  })

  return scored.slice(0, safeLimit).map(item => item.cand)
}