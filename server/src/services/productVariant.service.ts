// Pure, database-free helpers used by the product variant routes.
// Kept side-effect free so they can be unit tested without a Mongo
// connection (see tests/variants.test.ts). The routes remain the
// authoritative validator — this only centralizes the rules.

function asNumber(value: unknown): number {
  if (typeof value === 'string' && value.trim() === '') return NaN
  return Number(value)
}

// Returns an error message for an invalid payload, or null when the payload
// is valid. `create` enables the rules that only apply to new variants
// (name + price required).
export function validateVariantPayload(body: Record<string, any>, opts: { create: boolean }): string | null {
  const priceMissing =
    opts.create &&
    (body.price === undefined || body.price === null || (typeof body.price === 'string' && body.price.trim() === ''))
  if (opts.create && (!body.name || priceMissing)) return 'Name and price are required'

  if (body.price !== undefined && body.price !== null) {
    const price = asNumber(body.price)
    if (!Number.isFinite(price) || price < 0) return 'Price must be >= 0'
  }

  if (body.discountPrice !== undefined && body.discountPrice !== null) {
    const discountPrice = asNumber(body.discountPrice)
    if (!Number.isFinite(discountPrice) || discountPrice < 0) return 'discountPrice must be a non-negative number'
  }

  if (body.stock !== undefined && body.stock !== null) {
    const stock = asNumber(body.stock)
    if (!Number.isFinite(stock) || stock < 0) return 'stock must be a non-negative number'
  }

  if (body.sku !== undefined && body.sku !== null && String(body.sku).trim() === '') {
    return 'sku must be a non-empty string'
  }

  for (const key of ['images', 'specifications', 'whatsIncluded']) {
    if (body[key] !== undefined && body[key] !== null && !Array.isArray(body[key])) {
      return `${key} must be an array`
    }
  }

  return null
}

// Mongoose surfaces unique-index violations (e.g. the sku unique index)
// as MongoDB duplicate-key errors (code 11000) which surface as a generic
// 500. Detect them so the routes can map them to a 409 Conflict instead.
export function isDuplicateKeyError(error: unknown): boolean {
  const e = error as { code?: number; codeName?: string } | null | undefined
  return !!e && (e.code === 11000 || e.codeName === 'DuplicateKey')
}

// Mirrors the established products-list gating: inactive records are only
// exposed to admins, and only when they explicitly ask via includeAll=true.
// Non-admins can never see inactive records, even with includeAll=true.
export function variantListMatchesRole(role: string | undefined, includeAll: unknown): boolean {
  return includeAll === 'true' && role === 'ADMIN'
}

const INTERNAL_VARIANT_FIELDS = ['reservedStock', 'soldCount', '__v'] as const

// Projects a variant for public responses: strips internal stock/ledger
// bookkeeping fields while preserving everything the storefront renders.
export function publicVariantProject(variant: any): any {
  if (!variant || typeof variant !== 'object') return variant
  const copy: Record<string, any> = { ...variant }
  for (const field of INTERNAL_VARIANT_FIELDS) delete copy[field]
  return copy
}