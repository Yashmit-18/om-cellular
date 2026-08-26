import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-helpers'
import { requireAdmin } from '@/lib/auth-helpers'
import { slugify } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search') || undefined
  const brand = searchParams.get('brand') || undefined
  const category = searchParams.get('category') || undefined
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const storage = searchParams.get('storage') || undefined
  const ram = searchParams.get('ram') || undefined
  const condition = searchParams.get('condition') || undefined
  const sort = searchParams.get('sort') || 'createdAt'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const isFeatured = searchParams.get('isFeatured')
  const isRefurbished = searchParams.get('isRefurbished')
  const isNewArrival = searchParams.get('isNewArrival')
  const isBestSeller = searchParams.get('isBestSeller')
  const includeAllParam = searchParams.get('includeAll') === 'true'

  const session = await getSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const includeAll = includeAllParam && isAdmin

  const where: Record<string, unknown> = includeAll ? {} : { isActive: true }

  try {
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

    const skip = (page - 1) * limit

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
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const {
      name, description, brandId, categoryId,
      isFeatured, isNewArrival, isBestSeller, isRefurbished,
      condition, warranty, returnPolicy, seoTitle, seoDescription, seoKeywords,
      variants,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    let slug = slugify(name)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        brandId: brandId || null,
        categoryId: categoryId || null,
        isFeatured: isFeatured || false,
        isNewArrival: isNewArrival || false,
        isBestSeller: isBestSeller || false,
        isRefurbished: isRefurbished || false,
        condition: condition || null,
        warranty: warranty || null,
        returnPolicy: returnPolicy || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
      },
    })

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const variantSku = v.sku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name || name,
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

    return NextResponse.json({ message: 'Product created successfully', product: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
