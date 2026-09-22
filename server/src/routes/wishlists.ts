import { Router, Response } from 'express'
import mongoose from 'mongoose'
import { Wishlist } from '../models/wishlist.model'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { authenticate } from '../middleware/auth'
import { AuthRequest } from '../types'
import { mergeWishlistIds, isObjectIdLike } from '../services/wishlist.service'
import { publicVariantProject } from '../services/productVariant.service'
import { effectiveVariantPrice, computeProductSummary } from '../services/productView.service'

const router = Router()

const MAX_WISHLIST_ITEMS = 100

// Coerces a raw POST/merge body into a bounded, de-duplicated list of
// ObjectId-shaped variant ids. Anything else is silently dropped — the
// database lookups below decide what actually still exists.
function parseVariantIds(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string' || !isObjectIdLike(value)) continue
    if (seen.has(value)) continue
    seen.add(value)
    ids.push(value)
    if (ids.length >= MAX_WISHLIST_ITEMS) break
  }
  return ids
}

// Builds the full wishlist view for a user against the live catalogue:
// entries whose product or variant was deactivated are dropped (no dead
// cards) and the list keeps newest-first server order.
async function resolveWishlist(userId: string) {
  const entries = await Wishlist.find({ userId }).sort({ createdAt: -1 }).lean()
  const variantIds = entries.map(e => String(e.variantId))

  const variants = (await ProductVariant
    .find({ _id: { $in: variantIds }, isActive: true })
    .populate([
      { path: 'productId', match: { isActive: { $ne: false } }, populate: [{ path: 'brand' }, { path: 'category' }] },
    ])
    .lean()) as any[]

  const validVariants = new Map<string, any>()
  for (const variant of variants) {
    const product = variant.productId
    // An active variant whose product can't be populated (missing or
    // deactivated) is a dead entry — skip it.
    if (!product || typeof product !== 'object' || !product._id) continue
    validVariants.set(String(variant._id), { ...variant, productId: String(product._id), product })
  }

  const data = entries
    .filter(entry => validVariants.has(String(entry.variantId)))
    .map(entry => {
      const row = validVariants.get(String(entry.variantId)) as any
      const product = row.product
      const variantWithId = { ...row, id: String(row._id) }
      const unitPrice = effectiveVariantPrice(variantWithId)
      return {
        id: String(entry._id),
        variantId: String(entry.variantId),
        productId: row.productId,
        createdAt: entry.createdAt,
        product: {
          ...product,
          id: String(product._id),
          variants: [publicVariantProject(variantWithId)],
          ...computeProductSummary(product, [variantWithId]),
          lowestPrice: unitPrice,
          highestPrice: unitPrice,
        },
      }
    })

  return data
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id)
    if (!isObjectIdLike(userId)) return res.status(401).json({ success: false, message: 'Authentication required' })

    const [data, total] = await Promise.all([
      resolveWishlist(userId),
      Wishlist.countDocuments({ userId }),
    ])
    return res.json({ success: true, data, total })
  } catch (error) {
    console.error('GET /wishlist error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/:variantId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id)
    const { variantId } = req.params
    if (!isObjectIdLike(userId)) return res.status(401).json({ success: false, message: 'Authentication required' })
    if (!isObjectIdLike(variantId)) return res.status(400).json({ success: false, message: 'Invalid variant id' })

    const total = await Wishlist.countDocuments({ userId })
    if (total >= MAX_WISHLIST_ITEMS) {
      return res.status(400).json({ success: false, message: `Wishlist limit of ${MAX_WISHLIST_ITEMS} items reached` })
    }

    const variant: any = await ProductVariant.findOne({ _id: variantId, isActive: true }).select('productId').lean()
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })

    const product: any = await Product.findOne({ _id: variant.productId, isActive: true }).select('_id').lean()
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    if (!(await Wishlist.exists({ userId, variantId }))) {
      await Wishlist.create({ userId, variantId })
    }

    const data = await resolveWishlist(userId)
    return res.status(201).json({ success: true, message: 'Added to wishlist', data })
  } catch (error) {
    console.error('POST /wishlist/:variantId error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:variantId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id)
    const { variantId } = req.params
    if (!isObjectIdLike(userId)) return res.status(401).json({ success: false, message: 'Authentication required' })
    if (!isObjectIdLike(variantId)) return res.status(400).json({ success: false, message: 'Invalid variant id' })

    await Wishlist.deleteOne({ userId, variantId })
    const data = await resolveWishlist(userId)
    return res.json({ success: true, message: 'Removed from wishlist', data })
  } catch (error) {
    console.error('DELETE /wishlist/:variantId error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Merges a guest's local (browser) wishlist into the signed-in user's server
// list. Ids that no longer resolve to a live variant under a live product are
// dropped instead of silently creating dead links.
router.post('/merge', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user?.id)
    if (!isObjectIdLike(userId)) return res.status(401).json({ success: false, message: 'Authentication required' })

    const incoming = parseVariantIds(req.body?.variantIds)

    if (incoming.length > 0) {
      const existingRows = await Wishlist.find({ userId }).select('variantId').lean()
      const existing = existingRows.map(r => String(r.variantId))
      const merged = mergeWishlistIds(existing, incoming, { filterIds: true })
      const newIds = merged.filter(id => !existing.includes(id))

      if (newIds.length > 0) {
        const liveVariants = await ProductVariant
          .find({ _id: { $in: newIds }, isActive: true })
          .select('productId')
          .lean()
        const productIds = Array.from(new Set((liveVariants as any[]).map(v => String(v.productId))))
        const liveProducts = productIds.length
          ? await Product.find({ _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) }, isActive: true }).select('_id').lean()
          : []
        const liveProductIds = new Set((liveProducts as any[]).map(p => String(p._id)))

        const mergeable: string[] = []
        const seen = new Set<string>()
        for (const v of liveVariants as any[]) {
          const vid = String(v._id)
          if (seen.has(vid)) continue
          seen.add(vid)
          if (liveProductIds.has(String(v.productId))) mergeable.push(vid)
        }

        if (mergeable.length > 0) {
          // ordered:false + catch swallows duplicate-key races with POST.
          await Wishlist.insertMany(mergeable.map(variantId => ({ userId, variantId })), { ordered: false }).catch(() => {})
        }
      }
    }

    const data = await resolveWishlist(userId)
    return res.json({ success: true, message: 'Wishlist synced', data })
  } catch (error) {
    console.error('POST /wishlist/merge error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router