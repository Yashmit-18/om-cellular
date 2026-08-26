import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, cartTotal, productIds } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      )
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 404 }
      )
    }

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'This coupon is no longer active' },
        { status: 400 }
      )
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This coupon has expired' },
        { status: 400 }
      )
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: 'This coupon has reached its usage limit' },
        { status: 400 }
      )
    }

    if (coupon.minOrderAmount && cartTotal && cartTotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { error: `Minimum order amount is ₹${coupon.minOrderAmount}` },
        { status: 400 }
      )
    }

    if (coupon.applicableTo !== 'ALL' && productIds && productIds.length > 0) {
      const applicableIds = JSON.parse(coupon.applicableProductIds) as string[]
      const hasApplicable = productIds.some((id: string) => applicableIds.includes(id))
      if (!hasApplicable) {
        return NextResponse.json(
          { error: 'This coupon is not applicable to the products in your cart' },
          { status: 400 }
        )
      }
    }

    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = (cartTotal || 0) * (coupon.value / 100)
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount
      }
    } else if (coupon.type === 'FIXED') {
      discount = coupon.value
    }

    discount = Math.round(discount * 100) / 100

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount,
    })
  } catch (error) {
    console.error('POST /api/coupons/validate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
