import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAdmin } from '@/lib/auth'
import { getProducts, createProduct } from '@/server/products/product.service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const search = searchParams.get('search') || undefined
  const brand = searchParams.get('brand') || undefined
  const category = searchParams.get('category') || undefined
  const minPrice = searchParams.get('minPrice') || undefined
  const maxPrice = searchParams.get('maxPrice') || undefined
  const condition = searchParams.get('condition') || undefined
  const sort = searchParams.get('sort') || 'createdAt'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const isFeatured = searchParams.get('isFeatured') || undefined
  const isRefurbished = searchParams.get('isRefurbished') || undefined
  const isNewArrival = searchParams.get('isNewArrival') || undefined
  const isBestSeller = searchParams.get('isBestSeller') || undefined
  const includeAllParam = searchParams.get('includeAll') === 'true'

  const session = await getSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const includeAll = includeAllParam && isAdmin

  try {
    const result = await getProducts({
      search,
      brand,
      category,
      minPrice,
      maxPrice,
      condition,
      sort,
      page,
      limit,
      isFeatured,
      isRefurbished,
      isNewArrival,
      isBestSeller,
      includeAll,
    })

    return NextResponse.json(result)
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

    const product = await createProduct({
      name,
      description,
      brandId,
      categoryId,
      isFeatured,
      isNewArrival,
      isBestSeller,
      isRefurbished,
      condition,
      warranty,
      returnPolicy,
      seoTitle,
      seoDescription,
      seoKeywords,
      variants,
    })

    return NextResponse.json({ message: 'Product created successfully', product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
