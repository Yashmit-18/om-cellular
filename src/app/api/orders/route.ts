import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { generateOrderNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: { include: { variant: true } },
          address: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const body = await request.json()
    const { address, addressId, items, couponCode, paymentMethod, notes } = body

    const userId = session.user.id

    if (!items || !items.length) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    const orderNumber = generateOrderNumber()

    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { isActive: true } } },
      })

      if (!variant || !variant.isActive || !variant.product.isActive) {
        return NextResponse.json(
          { error: `Product variant not available` },
          { status: 400 }
        )
      }

      if (variant.stock < item.quantity || item.quantity < 1) {
        return NextResponse.json(
          { error: `Insufficient stock for ${variant.name}` },
          { status: 400 }
        )
      }

      const price = variant.discountPrice || variant.price
      const itemTotal = price * item.quantity

      orderItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        price: variant.price,
        discount: variant.discountPrice ? (variant.price - variant.discountPrice) * item.quantity : 0,
        total: itemTotal,
      })

      subtotal += itemTotal
    }

    const settingsRows = await prisma.setting.findMany({
      where: { key: { in: ['tax_rate', 'free_shipping_threshold', 'standard_shipping_price'] } },
    })
    const settingsMap: Record<string, string> = {}
    for (const s of settingsRows) settingsMap[s.key] = s.value

    const taxRate = parseFloat(settingsMap.tax_rate || '0.18') || 0.18
    const freeShippingThreshold = parseInt(settingsMap.free_shipping_threshold || '999') || 999
    const standardShippingPrice = parseInt(settingsMap.standard_shipping_price || '99') || 99

    const shipping = subtotal >= freeShippingThreshold ? 0 : standardShippingPrice
    const tax = Math.round(subtotal * taxRate * 100) / 100

    let resolvedAddressId = addressId || null
    if (!resolvedAddressId && address && address.name && address.addressLine1 && address.city && address.state && address.pincode) {
      const savedAddress = await prisma.address.create({
        data: {
          userId,
          name: address.name,
          phone: address.phone || '',
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || null,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: 'IN',
          isDefault: false,
        },
      })
      resolvedAddressId = savedAddress.id
    }

    let couponDiscount = 0
    let couponId = null

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      })

      if (coupon && coupon.isActive) {
        const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()
        const withinLimit = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit
        const meetsMinimum = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount
        const applicableToMatch = !coupon.applicableTo || coupon.applicableTo === 'ALL'

        if (notExpired && withinLimit && meetsMinimum && applicableToMatch) {
          if (coupon.type === 'PERCENTAGE') {
            couponDiscount = subtotal * (coupon.value / 100)
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount
            }
          } else if (coupon.type === 'FIXED') {
            couponDiscount = coupon.value
          }
          couponDiscount = Math.round(couponDiscount * 100) / 100
          couponId = coupon.id
        }
      }
    }

    const total = Math.max(0, subtotal + shipping + tax - couponDiscount)

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: resolvedAddressId,
          subtotal,
          shipping,
          tax,
          total,
          couponId: couponId || null,
          couponDiscount,
          paymentMethod: paymentMethod || null,
          notes: notes || null,
          items: { create: orderItems },
        },
        include: {
          items: { include: { variant: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      })

      for (const item of orderItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        })
      }

      return newOrder
    })

    return NextResponse.json(
      { message: 'Order created successfully', order },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
