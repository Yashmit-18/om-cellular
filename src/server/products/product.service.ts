import "server-only"
import { prisma } from '@/lib/db'

export async function getProducts(params: {
  page?: number
  limit?: number
  category?: string
  brand?: string
  search?: string
  condition?: string
  minPrice?: string
  maxPrice?: string
  isFeatured?: string
  isRefurbished?: string
  isNewArrival?: string
  isBestSeller?: string
  sort?: string
  includeAll?: boolean
}) {
  const {
    page = 1,
    limit = 20,
    category,
    brand,
    search,
    condition,
    minPrice,
    maxPrice,
    isFeatured,
    isRefurbished,
    isNewArrival,
    isBestSeller,
    sort = 'createdAt',
    includeAll = false,
  } = params

  const safeLimit = Math.min(limit, 100)

  const where: Record<string, unknown> = includeAll ? {} : { isActive: true }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }

  if (brand) {
    where.brand = { slug: brand }
  }

  if (category) {
    where.category = { slug: category }
  }

  if (minPrice || maxPrice) {
    where.variants = {
      some: {
        isActive: true,
        ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
        ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      },
    }
  }

  if (condition) {
    where.condition = condition
  }

  if (isFeatured === 'true') where.isFeatured = true
  if (isRefurbished === 'true') where.isRefurbished = true
  if (isNewArrival === 'true') where.isNewArrival = true
  if (isBestSeller === 'true') where.isBestSeller = true

  let orderBy: Record<string, string> = {}
  switch (sort) {
    case 'price_asc': orderBy = { createdAt: 'asc' }; break
    case 'price_desc': orderBy = { createdAt: 'desc' }; break
    case 'name': orderBy = { name: 'asc' }; break
    default: orderBy = { createdAt: 'desc' }
  }

  const skip = (page - 1) * safeLimit

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        variants: { where: { isActive: true } },
      },
      orderBy,
      skip,
      take: safeLimit,
    }),
    prisma.product.count({ where }),
  ])

  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / safeLimit),
  }
}

export async function getProductById(id: string, includeAll = false) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: true,
      variants: includeAll ? true : { where: { isActive: true } },
    },
  })

  return product
}

export async function createProduct(data: {
  name: string
  description?: string
  brandId?: string
  categoryId?: string
  isFeatured?: boolean
  isNewArrival?: boolean
  isBestSeller?: boolean
  isRefurbished?: boolean
  condition?: string
  warranty?: string
  returnPolicy?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  variants?: Array<{
    name?: string
    sku?: string
    price?: number
    discountPrice?: number
    stock?: number
    ram?: string
    storage?: string
    color?: string
    condition?: string
    images?: unknown[]
    specifications?: unknown[]
    whatsIncluded?: unknown[]
  }>
}) {
  let slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const existing = await prisma.product.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      isFeatured: data.isFeatured || false,
      isNewArrival: data.isNewArrival || false,
      isBestSeller: data.isBestSeller || false,
      isRefurbished: data.isRefurbished || false,
      condition: data.condition || null,
      warranty: data.warranty || null,
      returnPolicy: data.returnPolicy || null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoKeywords: data.seoKeywords || null,
    },
  })

  if (data.variants && Array.isArray(data.variants)) {
    for (const v of data.variants) {
      if (v.price !== undefined && v.price < 0) {
        throw new Error('Variant price must be >= 0')
      }
      const variantSku = v.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: v.name || data.name,
          sku: variantSku,
          price: v.price || 0,
          discountPrice: v.discountPrice || null,
          stock: v.stock || 0,
          ram: v.ram || null,
          storage: v.storage || null,
          color: v.color || null,
          condition: v.condition || null,
          images: JSON.stringify(v.images || []),
          specifications: JSON.stringify(v.specifications || []),
          whatsIncluded: JSON.stringify(v.whatsIncluded || []),
        },
      })
    }
  }

  const result = await prisma.product.findUnique({
    where: { id: product.id },
    include: { brand: true, category: true, variants: true },
  })

  return result
}
