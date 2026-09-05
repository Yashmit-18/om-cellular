export interface CouponDiscountInput {
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  maxDiscount?: number | null
  minOrderAmount?: number | null
}

// Pure discount computation shared by coupon validation and order creation so
// the displayed discount always matches the applied discount. The returned
// value is always within [0, total].
export function applyCouponDiscount(coupon: CouponDiscountInput, total: number): number {
  const safeTotal = Math.max(0, Number.isFinite(total) ? total : 0)
  const raw = coupon.type === 'PERCENTAGE' ? Math.round((safeTotal * Number(coupon.value || 0)) / 100) : Math.round(Number(coupon.value || 0))
  const maxCapped = coupon.maxDiscount ? Math.min(raw, Math.max(0, Number(coupon.maxDiscount))) : raw
  return Math.max(0, Math.min(safeTotal, maxCapped))
}

// Returns an error message when the coupon is not applicable to the given
// cart total, otherwise null.
export function couponApplicabilityError(coupon: CouponDiscountInput, total: number): string | null {
  const safeTotal = Math.max(0, Number.isFinite(total) ? total : 0)
  if (coupon.minOrderAmount && safeTotal < coupon.minOrderAmount) {
    return `This coupon requires a minimum order of ₹${coupon.minOrderAmount}`
  }
  return null
}

export function validateCouponFields(body: any): string | null {
  const { type, value, usageLimit, maxPerUser, minOrderAmount, maxDiscount } = body
  if (type && !['PERCENTAGE', 'FIXED'].includes(type)) return 'type must be PERCENTAGE or FIXED'
  if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) return 'value must be a non-negative number'
  if (usageLimit !== undefined && (!Number.isFinite(Number(usageLimit)) || Number(usageLimit) < 1)) return 'usageLimit must be at least 1'
  if (maxPerUser !== undefined && (!Number.isFinite(Number(maxPerUser)) || Number(maxPerUser) < 1)) return 'maxPerUser must be at least 1'
  if (minOrderAmount !== undefined && (!Number.isFinite(Number(minOrderAmount)) || Number(minOrderAmount) < 0)) return 'minOrderAmount must be a non-negative number'
  if (maxDiscount !== undefined && (!Number.isFinite(Number(maxDiscount)) || Number(maxDiscount) < 0)) return 'maxDiscount must be a non-negative number'
  return null
}