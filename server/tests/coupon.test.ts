import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyCouponDiscount, couponApplicabilityError, validateCouponFields } from '../src/services/coupon.service'

test('percentage coupon discount is rounded and capped at total', () => {
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 10 }, 999), 100)
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 50 }, 999), 500)
  // never more than the cart total
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 200 }, 999), 999)
  // zero total never goes negative
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 10 }, 0), 0)
})

test('maxDiscount caps a percentage coupon', () => {
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 30, maxDiscount: 100 }, 999), 100)
  assert.equal(applyCouponDiscount({ type: 'PERCENTAGE', value: 10, maxDiscount: 100 }, 999), 100)
})

test('fixed coupon applies flat value but never exceeds total', () => {
  assert.equal(applyCouponDiscount({ type: 'FIXED', value: 200 }, 999), 200)
  assert.equal(applyCouponDiscount({ type: 'FIXED', value: 5000 }, 999), 999)
  assert.equal(applyCouponDiscount({ type: 'FIXED', value: 200 }, 150), 150)
})

test('min order amount gates a coupon', () => {
  assert.equal(couponApplicabilityError({ type: 'FIXED', value: 100, minOrderAmount: 500 }, 400), 'This coupon requires a minimum order of ₹500')
  assert.equal(couponApplicabilityError({ type: 'FIXED', value: 100, minOrderAmount: 500 }, 500), null)
  assert.equal(couponApplicabilityError({ type: 'PERCENTAGE', value: 10 }, 0), null)
})

test('coupon field validation rejects malformed data', () => {
  assert.equal(validateCouponFields({}), null)
  assert.equal(validateCouponFields({ type: 'BOGUS' }), 'type must be PERCENTAGE or FIXED')
  assert.equal(validateCouponFields({ value: -5 }), 'value must be a non-negative number')
  assert.equal(validateCouponFields({ usageLimit: 0 }), 'usageLimit must be at least 1')
  assert.equal(validateCouponFields({ maxPerUser: 0 }), 'maxPerUser must be at least 1')
  assert.equal(validateCouponFields({ minOrderAmount: -1 }), 'minOrderAmount must be a non-negative number')
  assert.equal(validateCouponFields({ maxDiscount: 'abc' }), 'maxDiscount must be a non-negative number')
  // valid input is accepted
  assert.equal(validateCouponFields({ type: 'PERCENTAGE', value: 10.5, usageLimit: 100, maxPerUser: 1, minOrderAmount: 0, maxDiscount: 500 }), null)
})