import { Router, Response } from 'express'
import mongoose from 'mongoose'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { recordInventoryMovement } from '../models/inventoryLedger.model'
import { requireAdmin, optionalAuth } from '../middleware/auth'
import { AuthRequest } from '../types'
import { slugify } from '../utils/helpers'
import { validateVariantPayload, isDuplicateKeyError, variantListMatchesRole, publicVariantProject } from '../services/productVariant.service'
import {
  parseProductQuery,
  buildProductMatch,
  buildVariantAttrCondition,
  buildPostLookupMatch,
  buildSortDoc,
  cleanStringValues,
  sortStorageValues,
} from '../services/productFilter.service'

const router = Router()

function extractVariantImage(variant: any): string {
  if (!variant.images) return ''
  if (typeof variant.images === 'string') return variant.images
  if (Array.isArray(variant.images)) return variant.images.find(Boolean) || ''
  return ''
}

function effectiveVariantPrice(variant: any): number {
  const p = Number(variant.price) || 0
  const dp = variant.discountPrice != null ? Number(variant.discountPrice) : null
  return dp !== null && dp < p ? dp : p
}

function computeProductSummary(p: any, variants: any[]) {
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

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = parseProductQuery(req.query as Record<string, any>, { isAdmin: req.user?.role === 'ADMIN' })
    const { limit: safeLimit, page: safePage } = parsed

    const emptyPagination = { page: safePage, limit: safeLimit, total: 0, totalPages: 1, hasNext: false, hasPrev: false }

    // A malformed id can never match, so short-circuit exactly like the old
    // single-value behaviour instead of throwing a CastError downstream.
    if (parsed.invalidBrand || parsed.invalidCategory) {
      return res.json({ success: true, data: [], pagination: emptyPagination })
    }

    // Inactive/draft products are only visible to admins; public callers (or
    // anyone without an admin token) can never list them, even via includeAll.
    const match = buildProductMatch(parsed)
    const variantAttrCondition = buildVariantAttrCondition(parsed)
    const postLookupMatch = buildPostLookupMatch(parsed)
    const sortDoc = buildSortDoc(parsed.sort)

    const summaryFields: any = {
      lowestPrice: { $cond: [{ $eq: [{ $size: '$variants' }, 0] }, 0, { $min: '$variants._effectivePrice' }] },
      highestPrice: { $cond: [{ $eq: [{ $size: '$variants' }, 0] }, 0, { $max: '$variants._effectivePrice' }] },
      variantCount: { $size: '$variants' },
      maxDiscount: { $cond: [{ $eq: [{ $size: '$variants' }, 0] }, 0, { $max: '$variants._discountPct' }] },
      inStock: {
        $in: [
          true,
          { $map: { input: '$variants', as: 'v', in: { $gt: [{ $ifNull: ['$$v.stock', 0] }, 0] } } },
        ],
      },
    }
    if (variantAttrCondition) {
      summaryFields._matchedVariants = { $filter: { input: '$variants', as: 'v', cond: variantAttrCondition } }
    }

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'productvariants',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$productId', '$$pid'] }, { $eq: ['$isActive', true] }] } } },
          ],
          as: 'variants',
        },
      },
      {
        $addFields: {
          variants: {
            $map: {
              input: '$variants',
              as: 'v',
              in: {
                $mergeObjects: [
                  '$$v',
                  {
                    _effectivePrice: {
                      $cond: [
                        { $and: [{ $ne: ['$$v.discountPrice', null] }, { $lt: ['$$v.discountPrice', '$$v.price'] }] },
                        '$$v.discountPrice',
                        '$$v.price',
                      ],
                    },
                    _discountPct: {
                      $cond: [
                        {
                          $and: [
                            { $gt: ['$$v.price', 0] },
                            { $ne: ['$$v.discountPrice', null] },
                            { $lt: ['$$v.discountPrice', '$$v.price'] },
                          ],
                        },
                        { $multiply: [{ $divide: [{ $subtract: ['$$v.price', '$$v.discountPrice'] }, '$$v.price'] }, 100] },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $addFields: summaryFields },
      {
        $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: '_brand' },
      },
      {
        $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: '_category' },
      },
      {
        $addFields: {
          brand: { $arrayElemAt: ['$_brand', 0] },
          category: { $arrayElemAt: ['$_category', 0] },
        },
      },
      ...(Object.keys(postLookupMatch).length ? [{ $match: postLookupMatch }] : []),
      { $sort: sortDoc },
      {
        $facet: {
          docs: [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }],
          meta: [{ $count: 'total' }],
        },
      },
    ]

    const [result] = await Product.aggregate(pipeline)
    const raw = result?.docs || []
    const total = result?.meta?.[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / safeLimit))

    // primaryImage is an output-only computed field; derive it here so the
    // pipeline stays free of fragile array/string shape handling.
    // Aggregated rows are plain POJOs — Mongoose's `id` virtual never runs on
    // them, so expose `id` explicitly for both the product and its variants.
    const data = raw.map((p: any) => {
      const { _matchedVariants, ...rest } = p
      return {
        ...rest,
        id: String(rest._id),
        variants: (rest.variants || []).map((v: any) => ({ ...publicVariantProject(v), id: String(v._id) })),
        primaryImage:
          (Array.isArray(rest.images) && rest.images.find(Boolean)) ||
          (rest.variants || []).map(extractVariantImage).find(Boolean) ||
          '',
      }
    })

    return res.json({
      success: true,
      data,
      pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNext: safePage < totalPages, hasPrev: safePage > 1 },
    })
  } catch (error) {
    console.error('GET /products error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Facet source for the listing filter UI. Must stay above GET /:id so the
// literal "filters" segment is never treated as a product id.
router.get('/filters', optionalAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const [priceAgg, brandAgg, categoryAgg, conditionAgg, variantAgg] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'productvariants',
            let: { pid: '$_id' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$productId', '$$pid'] }, { $eq: ['$isActive', true] }] } } },
              {
                $project: {
                  _p: {
                    $cond: [
                      { $and: [{ $ne: ['$discountPrice', null] }, { $lt: ['$discountPrice', '$price'] }] },
                      '$discountPrice',
                      '$price',
                    ],
                  },
                },
              },
            ],
            as: 'variants',
          },
        },
        { $match: { 'variants.0': { $exists: true } } },
        { $addFields: { _lowest: { $min: '$variants._p' } } },
        { $group: { _id: null, min: { $min: '$_lowest' }, max: { $max: '$_lowest' } } },
      ]),
      Product.aggregate([
        { $match: { isActive: true, brandId: { $ne: null } } },
        { $group: { _id: '$brandId', count: { $sum: 1 } } },
        { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brand' } },
        { $unwind: '$brand' },
        { $match: { 'brand.isActive': true } },
        { $project: { _id: 0, id: { $toString: '$_id' }, name: '$brand.name', slug: '$brand.slug', count: 1 } },
        { $sort: { name: 1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true, categoryId: { $ne: null } } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $match: { 'category.isActive': true } },
        { $project: { _id: 0, id: { $toString: '$_id' }, name: '$category.name', slug: '$category.slug', count: 1 } },
        { $sort: { name: 1 } },
      ]),
      Product.aggregate([
        { $match: { isActive: true, condition: { $nin: [null, ''] } } },
        { $group: { _id: '$condition', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $project: { _id: 0, value: '$_id', count: 1 } },
      ]),
      ProductVariant.aggregate([
        { $match: { isActive: true } },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $match: { 'product.isActive': true } },
        {
          $group: {
            _id: null,
            storages: { $addToSet: '$storage' },
            rams: { $addToSet: '$ram' },
            colors: { $addToSet: '$color' },
          },
        },
      ]),
    ])

    const price = priceAgg[0] || { min: 0, max: 0 }
    const variantOptions = variantAgg[0] || { storages: [], rams: [], colors: [] }
    const CONDITIONS: Record<string, string> = { NEW: 'Brand New', LIKE_NEW: 'Like New', EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair' }
    const conditions = (conditionAgg || []).map((c: any) => ({
      value: c.value,
      label: CONDITIONS[c.value] || c.value,
      count: c.count,
    }))

    return res.json({
      success: true,
      data: {
        price: { min: Number(price.min) || 0, max: Number(price.max) || 0 },
        brands: brandAgg || [],
        categories: categoryAgg || [],
        conditions,
        storages: sortStorageValues(cleanStringValues(variantOptions.storages || [])),
        rams: sortStorageValues(cleanStringValues(variantOptions.rams || [])),
        colors: cleanStringValues(variantOptions.colors || []).sort((a, b) => a.localeCompare(b)),
      },
    })
  } catch (error) {
    console.error('GET /products/filters error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/by-variant/:variantId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { variantId } = req.params
    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ success: false, message: 'Invalid variant id' })
    }
    // Must stay above GET /:id — it matches the literal "by-variant" prefix.
    const variant: any = await ProductVariant.findOne({ _id: variantId, isActive: true }).lean()
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })

    const product: any = await Product.findOne({ _id: variant.productId, isActive: true }).populate('brand').populate('category')
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    const variantWithId = { ...variant, id: String(variant._id) }
    return res.json({
      success: true,
      data: {
        ...product.toObject(),
        variants: [publicVariantProject(variantWithId)],
        ...computeProductSummary(product, [variantWithId]),
      },
    })
  } catch (error) {
    console.error('GET /products/by-variant error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    let product: any = null

    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)) {
      product = await Product.findById(id).populate('brand').populate('category')
    }
    if (!product) {
      product = await Product.findOne({ slug: id }).populate('brand').populate('category')
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    if (!product.isActive && req.user?.role !== 'ADMIN') {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    const variants = await ProductVariant.find({ productId: product._id, isActive: true }).lean()
    return res.json({
      success: true,
      data: {
        ...product.toObject(),
        variants: variants.map((v: any) => ({ ...publicVariantProject(v), id: String(v._id) })),
        ...computeProductSummary(product, variants),
      },
    })
  } catch (error) {
    console.error('GET /products/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, brandId, categoryId, isFeatured, isNewArrival, isBestSeller, isRefurbished, condition, warranty, returnPolicy, seoTitle, seoDescription, seoKeywords, images, variants } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Product name is required' })

    let slug = slugify(name)
    const existing = await Product.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const product = await Product.create({
      name, slug, description, brandId: brandId || null, categoryId: categoryId || null,
      isFeatured: !!isFeatured, isNewArrival: !!isNewArrival, isBestSeller: !!isBestSeller, isRefurbished: !!isRefurbished,
      condition, warranty, returnPolicy, seoTitle, seoDescription, seoKeywords,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
    })

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        if (v.price !== undefined && v.price < 0) {
          return res.status(400).json({ success: false, message: 'Variant price must be >= 0' })
        }
        const variantSku = v.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await ProductVariant.create({
          productId: product._id, name: v.name || name, sku: variantSku, price: v.price || 0,
          discountPrice: v.discountPrice || null, stock: v.stock || 0, ram: v.ram, storage: v.storage,
          color: v.color, condition: v.condition, images: v.images || [], specifications: v.specifications || [],
          whatsIncluded: v.whatsIncluded || [],
        })
      }
    }

    const result = await Product.findById(product._id).populate('brand').populate('category')
    const resultVariants = await ProductVariant.find({ productId: product._id })

    return res.status(201).json({ success: true, message: 'Product created', data: { ...result!.toObject(), variants: resultVariants } })
  } catch (error) {
    console.error('POST /products error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await Product.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' })

    const updateData: any = {}
    const fields = ['name', 'description', 'brandId', 'categoryId', 'isFeatured', 'isNewArrival', 'isBestSeller', 'isRefurbished', 'condition', 'warranty', 'returnPolicy', 'seoTitle', 'seoDescription', 'seoKeywords', 'isActive']
    for (const field of fields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]
    }
    if (req.body.images !== undefined) {
      updateData.images = Array.isArray(req.body.images) ? req.body.images.filter(Boolean) : []
    }

    if (req.body.name && req.body.name !== existing.name) {
      let slug = slugify(req.body.name)
      const slugExists = await Product.findOne({ slug, _id: { $ne: id } })
      if (slugExists) slug = `${slug}-${Date.now()}`
      updateData.slug = slug
    }

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true }).populate('brand').populate('category')
    const variants = await ProductVariant.find({ productId: id })

    return res.json({ success: true, message: 'Product updated', data: { ...product!.toObject(), variants } })
  } catch (error) {
    console.error('PUT /products/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    await Product.findByIdAndUpdate(req.params.id, { isActive: false })
    return res.json({ success: true, message: 'Product deactivated' })
  } catch (error) {
    console.error('DELETE /products/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id/variants', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const includeAll = variantListMatchesRole(req.user?.role, req.query.includeAll)
    const query: any = { productId: req.params.id }
    if (!includeAll) query.isActive = true
    const variants = await ProductVariant.find(query).lean()
    const data = variants.map((v: any) => ({ ...(includeAll ? v : publicVariantProject(v)), id: String(v._id) }))
    return res.json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/:id/variants', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    const { name, sku, price, discountPrice, stock, ram, storage, color, condition, images, specifications, whatsIncluded } = req.body
    const validationError = validateVariantPayload(req.body, { create: true })
    if (validationError) return res.status(400).json({ success: false, message: validationError })

    const variantSku = sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    try {
      const variant = await ProductVariant.create({
        productId: product._id, name, sku: variantSku, price, discountPrice: discountPrice ?? null, stock: stock ?? 0,
        ram, storage, color, condition, images: images || [], specifications: specifications || [],
        whatsIncluded: whatsIncluded || [],
      })
      return res.status(201).json({ success: true, message: 'Variant created', data: variant })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ success: false, message: 'SKU is already in use' })
      }
      throw error
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id/variants/:variantId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const variant = await ProductVariant.findById(req.params.variantId)
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })
    if (variant.productId.toString() !== req.params.id) return res.status(400).json({ success: false, message: 'Variant does not belong to this product' })

    const validationError = validateVariantPayload(req.body, { create: false })
    if (validationError) return res.status(400).json({ success: false, message: validationError })

    let stockDelta = 0
    if (req.body.stock !== undefined) {
      req.body.stock = Number(req.body.stock)
      stockDelta = req.body.stock - Number(variant.stock || 0)
    }

    let updated
    try {
      updated = await ProductVariant.findByIdAndUpdate(req.params.variantId, req.body, { new: true })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ success: false, message: 'SKU is already in use' })
      }
      throw error
    }
    if (stockDelta !== 0) {
      // Keep the inventory ledger complete when stock is edited through the
      // product variant form (same MANUAL_ADJUSTMENT reason as the inventory page).
      await recordInventoryMovement({
        variantId: variant._id,
        productId: variant.productId,
        delta: stockDelta,
        reason: 'MANUAL_ADJUSTMENT',
        quantityAfter: Number(updated!.stock || 0),
        adminId: req.user?.id as any,
        note: 'Stock updated via product variant edit',
      }).catch(() => {})
    }
    return res.json({ success: true, message: 'Variant updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id/variants/:variantId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const variant = await ProductVariant.findById(req.params.variantId)
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })
    if (variant.productId.toString() !== req.params.id) return res.status(400).json({ success: false, message: 'Variant does not belong to this product' })

    await ProductVariant.findByIdAndUpdate(req.params.variantId, { isActive: false })
    return res.json({ success: true, message: 'Variant deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
