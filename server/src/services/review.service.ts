import mongoose from 'mongoose'
import { Product } from '../models/product.model'
import { Review } from '../models/review.model'

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type ReviewStatus = typeof REVIEW_STATUSES[number]

export function isValidObjectId(value: unknown): value is string {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[0-9a-f]{24}$/i.test(value)
}

export function validateReviewInput(input: { rating?: unknown; title?: unknown; comment?: unknown }) {
  const rating = Number(input.rating)
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const comment = typeof input.comment === 'string' ? input.comment.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Rating must be an integer between 1 and 5' } as const
  if (title.length > 120) return { error: 'Review title must be 120 characters or fewer' } as const
  if (comment.length < 10 || comment.length > 2000) return { error: 'Review text must be between 10 and 2000 characters' } as const
  return { value: { rating, title: title || undefined, comment } } as const
}

export function reviewSort(sort: string): Record<string, 1 | -1> {
  if (sort === 'highest') return { rating: -1, createdAt: -1 }
  if (sort === 'lowest') return { rating: 1, createdAt: -1 }
  return { createdAt: -1 }
}

export function summarizeRatings(rows: Array<{ _id: number; count: number }>) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let count = 0
  let total = 0
  for (const row of rows) {
    if (row._id < 1 || row._id > 5 || row.count <= 0) continue
    distribution[row._id as 1 | 2 | 3 | 4 | 5] = row.count
    count += row.count
    total += row._id * row.count
  }
  return { average: count ? Math.round((total / count) * 10) / 10 : null, count, distribution }
}

export async function getProductRatingSummary(productId: string) {
  if (!isValidObjectId(productId)) return summarizeRatings([])
  const rows = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'APPROVED', isApproved: true, isVerifiedPurchase: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ])
  return summarizeRatings(rows)
}

export async function refreshProductRating(productId: mongoose.Types.ObjectId | string) {
  const summary = await getProductRatingSummary(String(productId))
  await Product.updateOne({ _id: productId }, { $set: { rating: summary.average || 0, ratingCount: summary.count } })
  return summary
}

export function isEligibleReviewOrder(order: any, userId: string): boolean {
  return Boolean(order && String(order.userId) === userId && order.status === 'DELIVERED' && order.paymentStatus !== 'FAILED' && order.paymentStatus !== 'PENDING_PAYMENT')
}

export function isMatchingOrderItem(item: any, order: any, userId: string, variantId: string, orderItemId: string): boolean {
  return Boolean(item && order && String(item._id) === orderItemId && String(item.variantId) === variantId && isEligibleReviewOrder(order, userId))
}

export function isPublicReview(review: any): boolean {
  return review?.status === 'APPROVED' && review?.isApproved === true && review?.isVerifiedPurchase === true
}