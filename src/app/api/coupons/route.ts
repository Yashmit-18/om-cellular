import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.coupon.count(),
    ])

    return NextResponse.json({ coupons, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/coupons error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { code, description, type, value, minOrderAmount, maxDiscount, usageLimit, applicableTo, applicableProductIds, applicableCategoryIds, expiresAt } = body

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Code, type, and value are required' }, { status: 400 })
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        type,
        value,
        minOrderAmount: minOrderAmount || null,
        maxDiscount: maxDiscount || null,
        usageLimit: usageLimit || null,
        applicableTo: applicableTo || 'ALL',
        applicableProductIds: JSON.stringify(applicableProductIds || []),
        applicableCategoryIds: JSON.stringify(applicableCategoryIds || []),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ message: 'Coupon created', coupon }, { status: 201 })
  } catch (error) {
    console.error('POST /api/coupons error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
