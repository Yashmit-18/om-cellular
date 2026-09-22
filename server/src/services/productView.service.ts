// Shared product "view model" builders used by the products list, by-variant,
// related and wishlist endpoints so a product always serializes the same way
// regardless of which route produced it.

export function extractVariantImage(variant: any): string {
  if (!variant.images) return ''
  if (typeof variant.images === 'string') return variant.images
  if (Array.isArray(variant.images)) return variant.images.find(Boolean) || ''
  return ''
}

export function effectiveVariantPrice(variant: any): number {
  const p = Number(variant.price) || 0
  const dp = variant.discountPrice != null ? Number(variant.discountPrice) : null
  return dp !== null && dp < p ? dp : p
}

export function computeProductSummary(p: any, variants: any[]) {
  const effectivePrices = variants.map(effectiveVariantPrice)
  const noVariants = variants.length === 0
  const lowestPrice = noVariants ? 0 : Math.min(...effectivePrices)
  const highestPrice = noVariants ? 0 : Math.max(...effectivePrices)
  const anyImage =
    (Array.isArray(p.images) && p.images.find(Boolean)) ||
    variants.map(extractVariantImage).find(Boolean) ||
    ''
  return {
    lowestPrice,
    highestPrice,
    inStock: variants.some(v => (Number(v.stock) || 0) > 0),
    variantCount: variants.length,
    primaryImage: anyImage,
  }
}