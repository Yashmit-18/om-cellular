import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const variantId = searchParams.get('variantId') || undefined
    const approvedOnly = searchParams.get('approvedOnly') !== 'false'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {}
    if (variantId) where.variantId = variantId
    if (approvedOnly) where.isApproved = true

    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, image: true } },
          variant: { select: { id: true, name: true, product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ])

    return NextResponse.json({ reviews, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const body = await request.json()
    const { variantId, rating, title, comment } = body

    if (!variantId || !rating) {
      return NextResponse.json(
        { error: 'Variant ID and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const existing = await prisma.review.findFirst({
      where: { userId: session.user.id, variantId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    })

    if (!variant) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const hasDeliveredOrder = await prisma.orderItem.findFirst({
      where: {
        variantId,
        order: {
          userId: session.user.id,
          status: 'DELIVERED',
        },
      },
    })

    if (!hasDeliveredOrder) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased and received' },
        { status: 403 }
      )
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        variantId,
        rating,
        title: title || null,
        comment: comment || null,
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ message: 'Review created', review }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
