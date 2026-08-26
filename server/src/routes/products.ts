import { Router, Request, Response } from 'express'
import { Product } from '../models/product.model'
import { ProductVariant } from '../models/productVariant.model'
import { requireAdmin } from '../middleware/auth'
import { AuthRequest } from '../types'
import { slugify, paginate } from '../utils/helpers'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, brand, category, condition, sort = 'createdAt', isFeatured, isRefurbished, isNewArrival, isBestSeller, includeAll } = req.query
    const { skip, limit: safeLimit, page: safePage } = paginate(parseInt(page as string), parseInt(limit as string))

    const where: any = includeAll === 'true' ? {} : { isActive: true }
    if (search) where.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
    if (brand) where.brandId = brand
    if (category) where.categoryId = category
    if (condition) where.condition = condition
    if (isFeatured === 'true') where.isFeatured = true
    if (isRefurbished === 'true') where.isRefurbished = true
    if (isNewArrival === 'true') where.isNewArrival = true
    if (isBestSeller === 'true') where.isBestSeller = true

    let sortObj: any = { createdAt: -1 }
    if (sort === 'name') sortObj = { name: 1 }
    else if (sort === 'price_asc') sortObj = { createdAt: 1 }

    const [products, total] = await Promise.all([
      Product.find(where).populate('brand').populate('category').sort(sortObj).skip(skip).limit(safeLimit),
      Product.countDocuments(where),
    ])

    const productsWithVariants = await Promise.all(products.map(async (p) => {
      const variants = await ProductVariant.find({ productId: p._id, isActive: true })
      return { ...p.toObject(), variants }
    }))

    return res.json({
      success: true,
      data: productsWithVariants,
      pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    })
  } catch (error) {
    console.error('GET /products error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const product = await Product.findOne({ $or: [{ _id: id }, { slug: id }] }).populate('brand').populate('category')
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    const variants = await ProductVariant.find({ productId: product._id, isActive: true })
    return res.json({ success: true, data: { ...product.toObject(), variants } })
  } catch (error) {
    console.error('GET /products/:id error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, brandId, categoryId, isFeatured, isNewArrival, isBestSeller, isRefurbished, condition, warranty, returnPolicy, seoTitle, seoDescription, seoKeywords, variants } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Product name is required' })

    let slug = slugify(name)
    const existing = await Product.findOne({ slug })
    if (existing) slug = `${slug}-${Date.now()}`

    const product = await Product.create({
      name, slug, description, brandId: brandId || null, categoryId: categoryId || null,
      isFeatured: !!isFeatured, isNewArrival: !!isNewArrival, isBestSeller: !!isBestSeller, isRefurbished: !!isRefurbished,
      condition, warranty, returnPolicy, seoTitle, seoDescription, seoKeywords,
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
