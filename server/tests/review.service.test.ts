import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isEligibleReviewOrder, isMatchingOrderItem, isPublicReview, isValidObjectId, reviewSort, summarizeRatings, validateReviewInput } from '../src/services/review.service'

const id = '507f1f77bcf86cd799439011'

test('review input accepts genuine 1-star and 5-star reviews', () => {
  assert.equal(validateReviewInput({ rating: 1, comment: 'A clear review.' }).value?.rating, 1)
  assert.equal(validateReviewInput({ rating: 5, title: 'Excellent', comment: 'Arrived exactly as described.' }).value?.rating, 5)
})
test('review input rejects ratings outside 1 through 5', () => {
  assert.ok('error' in validateReviewInput({ rating: 0, comment: 'Valid enough text.' }))
  assert.ok('error' in validateReviewInput({ rating: 6, comment: 'Valid enough text.' }))
  assert.ok('error' in validateReviewInput({ rating: 2.5, comment: 'Valid enough text.' }))
})
test('review input rejects empty, short and oversized content', () => {
  assert.ok('error' in validateReviewInput({ rating: 4, comment: '' }))
  assert.ok('error' in validateReviewInput({ rating: 4, comment: 'short' }))
  assert.ok('error' in validateReviewInput({ rating: 4, comment: 'x'.repeat(2001) }))
  assert.ok('error' in validateReviewInput({ rating: 4, title: 'x'.repeat(121), comment: 'Long enough review.' }))
})
test('review input trims plain text without interpreting HTML', () => {
  const result = validateReviewInput({ rating: 4, comment: '  <script>alert(1)</script> arrived well.  ' })
  assert.equal(result.value?.comment, '<script>alert(1)</script> arrived well.')
})
test('ObjectId validation rejects arbitrary identifiers', () => {
  assert.equal(isValidObjectId(id), true)
  assert.equal(isValidObjectId('product-1'), false)
  assert.equal(isValidObjectId(''), false)
  assert.equal(isValidObjectId(null), false)
})
test('review sorting is deterministic and newest is the default', () => {
  assert.deepEqual(reviewSort('newest'), { createdAt: -1 })
  assert.deepEqual(reviewSort('highest'), { rating: -1, createdAt: -1 })
  assert.deepEqual(reviewSort('lowest'), { rating: 1, createdAt: -1 })
  assert.deepEqual(reviewSort('unsupported'), { createdAt: -1 })
})
test('rating summary calculates average, count and all five buckets', () => {
  assert.deepEqual(summarizeRatings([{ _id: 5, count: 2 }, { _id: 4, count: 1 }, { _id: 1, count: 1 }]), {
    average: 3.8,
    count: 4,
    distribution: { 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 },
  })
})
test('zero approved reviews have neutral summary values', () => {
  assert.deepEqual(summarizeRatings([]), { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
})
test('invalid rating buckets cannot fabricate a summary', () => {
  assert.deepEqual(summarizeRatings([{ _id: 0, count: 100 }, { _id: 6, count: 100 }]), { average: null, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
})

const delivered = { userId: id, status: 'DELIVERED', paymentStatus: 'PAID' }
test('delivered paid order is eligible', () => assert.equal(isEligibleReviewOrder(delivered, id), true))
test('pending order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, status: 'PENDING' }, id), false))
test('confirmed order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, status: 'CONFIRMED' }, id), false))
test('processing order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, status: 'PROCESSING' }, id), false))
test('shipped order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, status: 'SHIPPED' }, id), false))
test('cancelled order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, status: 'CANCELLED' }, id), false))
test('failed order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, paymentStatus: 'FAILED' }, id), false))
test('pending payment order is ineligible', () => assert.equal(isEligibleReviewOrder({ ...delivered, paymentStatus: 'PENDING_PAYMENT' }, id), false))
test('wrong user is ineligible', () => assert.equal(isEligibleReviewOrder(delivered, '507f1f77bcf86cd799439012'), false))
test('matching order item proves the purchased variant relationship', () => assert.equal(isMatchingOrderItem({ _id: 'item', variantId: id }, { ...delivered }, id, id, 'item'), true))
test('wrong order item is rejected', () => assert.equal(isMatchingOrderItem({ _id: 'other', variantId: id }, delivered, id, id, 'item'), false))
test('wrong purchased variant is rejected', () => assert.equal(isMatchingOrderItem({ _id: 'item', variantId: '507f1f77bcf86cd799439012' }, delivered, id, id, 'item'), false))
test('public review requires approval', () => assert.equal(isPublicReview({ status: 'PENDING', isApproved: false, isVerifiedPurchase: true }), false))
test('public review rejects moderation rejection', () => assert.equal(isPublicReview({ status: 'REJECTED', isApproved: false, isVerifiedPurchase: true }), false))
test('public review requires server verification', () => assert.equal(isPublicReview({ status: 'APPROVED', isApproved: true, isVerifiedPurchase: false }), false))
test('approved verified review is public', () => assert.equal(isPublicReview({ status: 'APPROVED', isApproved: true, isVerifiedPurchase: true }), true))
test('average rounds to one decimal', () => assert.equal(summarizeRatings([{ _id: 5, count: 1 }, { _id: 4, count: 1 }]).average, 4.5))
test('distribution includes zero buckets', () => assert.equal(summarizeRatings([{ _id: 3, count: 2 }]).distribution[1], 0))
test('distribution preserves five-star count', () => assert.equal(summarizeRatings([{ _id: 5, count: 7 }]).distribution[5], 7))
test('negative rating count cannot create public totals', () => assert.equal(summarizeRatings([{ _id: 5, count: -1 }]).count, 0))
test('title is optional', () => assert.equal(validateReviewInput({ rating: 3, comment: 'A useful customer note.' }).value?.title, undefined))
test('whitespace-only title is omitted', () => assert.equal(validateReviewInput({ rating: 3, title: '   ', comment: 'A useful customer note.' }).value?.title, undefined))
test('comment whitespace is normalized', () => assert.equal(validateReviewInput({ rating: 3, comment: '   A useful customer note.   ' }).value?.comment, 'A useful customer note.'))