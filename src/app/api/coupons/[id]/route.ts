import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const coupon = await prisma.coupon.findUnique({ where: { id } })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    return NextResponse.json({ coupon })
  } catch (error) {
    console.error('GET /api/coupons/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        code: body.code ? body.code.toUpperCase() : existing.code,
        description: body.description !== undefined ? body.description : existing.description,
        type: body.type ?? existing.type,
        value: body.value ?? existing.value,
        minOrderAmount: body.minOrderAmount !== undefined ? body.minOrderAmount : existing.minOrderAmount,
        maxDiscount: body.maxDiscount !== undefined ? body.maxDiscount : existing.maxDiscount,
        usageLimit: body.usageLimit !== undefined ? body.usageLimit : existing.usageLimit,
        applicableTo: body.applicableTo ?? existing.applicableTo,
        applicableProductIds: body.applicableProductIds ? JSON.stringify(body.applicableProductIds) : existing.applicableProductIds,
        applicableCategoryIds: body.applicableCategoryIds ? JSON.stringify(body.applicableCategoryIds) : existing.applicableCategoryIds,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : existing.expiresAt,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Coupon updated', coupon })
  } catch (error) {
    console.error('PUT /api/coupons/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params

    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Coupon deactivated' })
  } catch (error) {
    console.error('DELETE /api/coupons/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
