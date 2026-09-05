import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { slugify, paginate } from '../utils/helpers'

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeSearchTerm(value: string): string {
  return escapeRegex(String(value || '').trim().replace(/\s+/g, ' '))
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, query, brand, brandId, category, categoryId, condition, sort = 'newest', isFeatured, isRefurbished, isNewArrival, isBestSeller, minPrice, maxPrice, includeAll } = req.query
    const { limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const emptyPagination = { page: safePage, limit: safeLimit, total: 0, totalPages: 1, hasNext: false, hasPrev: false }

    const brandRef = (brand || brandId) as string | undefined
    if (brandRef && !(typeof brandRef === 'string' && mongoose.Types.ObjectId.isValid(brandRef))) {
      return res.json({ success: true, data: [], pagination: emptyPagination })
    }

    const categoryRef = (category || categoryId) as string | undefined
    if (categoryRef && !(typeof categoryRef === 'string' && mongoose.Types.ObjectId.isValid(categoryRef))) {
      return res.json({ success: true, data: [], pagination: emptyPagination })
    }

    const match: any = includeAll === 'true' ? {} : { isActive: true }
    const searchTerm = normalizeSearchTerm(((search || query) as string) || '')
    if (searchTerm) match.$or = [{ name: { $regex: searchTerm, $options: 'i' } }, { description: { $regex: searchTerm, $options: 'i' } }, { slug: { $regex: searchTerm, $options: 'i' } }]
    if (brandRef) match.brandId = new mongoose.Types.ObjectId(brandRef)
    if (categoryRef) match.categoryId = new mongoose.Types.ObjectId(categoryRef)
    if (condition) match.condition = condition
    if (isFeatured === 'true') match.isFeatured = true
    if (isRefurbished === 'true') match.isRefurbished = true
    if (isNewArrival === 'true') match.isNewArrival = true
    if (isBestSeller === 'true') match.isBestSeller = true

    const min = minPrice ? Number(minPrice) : null
    const max = maxPrice ? Number(maxPrice) : null
    const priceMatch: any = {}
    if (min !== null && !Number.isNaN(min)) priceMatch.lowestPrice = { ...(priceMatch.lowestPrice || {}), $gte: min }
    if (max !== null && !Number.isNaN(max)) priceMatch.lowestPrice = { ...(priceMatch.lowestPrice || {}), $lte: max }

    const sortBy = sort === 'name' ? 'name' : sort === 'price_asc' ? 'price_asc' : sort === 'price_desc' ? 'price_desc' : 'newest'
    const sortDoc = sortBy === 'name' ? { name: 1 } : sortBy === 'price_asc' ? { lowestPrice: 1, createdAt: -1 } : sortBy === 'price_desc' ? { lowestPrice: -1, createdAt: -1 } : { createdAt: -1 }

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
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          lowestPrice: { $cond: [{ $eq: [{ $size: '$variants' }, 0] }, 0, { $min: '$variants._effectivePrice' }] },
          highestPrice: { $cond: [{ $eq: [{ $size: '$variants' }, 0] }, 0, { $max: '$variants._effectivePrice' }] },
          variantCount: { $size: '$variants' },
          inStock: {
            $in: [
              true,
              { $map: { input: '$variants', as: 'v', in: { $gt: [{ $ifNull: ['$$v.stock', 0] }, 0] } } },
            ],
          },
        },
      },
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
      ...(Object.keys(priceMatch).length ? [{ $match: priceMatch }] : []),
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
    const data = raw.map((p: any) => ({
      ...p,
      primaryImage:
        (Array.isArray(p.images) && p.images.find(Boolean)) ||
        (p.variants || []).map(extractVariantImage).find(Boolean) ||
        '',
    }))

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

router.get('/:id', async (req: Request, res: Response) => {
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

    const variants = await ProductVariant.find({ productId: product._id, isActive: true })
    return res.json({ success: true, data: { ...product.toObject(), variants, ...computeProductSummary(product, variants) } })
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

router.get('/:id/variants', async (req: Request, res: Response) => {
  try {
    const variants = await ProductVariant.find({ productId: req.params.id, isActive: true })
    return res.json({ success: true, data: variants })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/:id/variants', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    const { name, sku, price, discountPrice, stock, ram, storage, color, condition, images, specifications, whatsIncluded } = req.body
    if (!name || price === undefined) return res.status(400).json({ success: false, message: 'Name and price are required' })
    if (price < 0) return res.status(400).json({ success: false, message: 'Price must be >= 0' })

    const variantSku = sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const variant = await ProductVariant.create({
      productId: product._id, name, sku: variantSku, price, discountPrice, stock: stock || 0,
      ram, storage, color, condition, images: images || [], specifications: specifications || [],
      whatsIncluded: whatsIncluded || [],
    })

    return res.status(201).json({ success: true, message: 'Variant created', data: variant })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.put('/:id/variants/:variantId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const variant = await ProductVariant.findById(req.params.variantId)
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' })
    if (variant.productId.toString() !== req.params.id) return res.status(400).json({ success: false, message: 'Variant does not belong to this product' })

    const updated = await ProductVariant.findByIdAndUpdate(req.params.variantId, req.body, { new: true })
    return res.json({ success: true, message: 'Variant updated', data: updated })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.delete('/:id/variants/:variantId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ProductVariant.findByIdAndUpdate(req.params.variantId, { isActive: false })
    return res.json({ success: true, message: 'Variant deactivated' })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
