import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession, requireAuth } from '@/lib/auth-helpers'
import { generateRequestNumber } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (session.user.role === 'ADMIN') {
      const status = searchParams.get('status') || undefined
      const search = searchParams.get('search') || undefined
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (search) {
        where.OR = [
          { requestNumber: { contains: search } },
          { oldBrand: { contains: search } },
          { oldModel: { contains: search } },
          { user: { name: { contains: search } } },
        ]
      }
      const skip = (page - 1) * limit
      const [requests, total] = await Promise.all([
        prisma.exchangeRequest.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            newVariant: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.exchangeRequest.count({ where }),
      ])
      return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) })
    }

    const [requests, total] = await Promise.all([
      prisma.exchangeRequest.findMany({
        where: { userId: session.user.id },
        include: { newVariant: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exchangeRequest.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/exchange-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  try {
    const body = await request.json()
    const { oldBrand, oldModel, oldStorage, oldRam, oldCondition, newVariantId, oldDeviceDetails } = body

    if (!oldBrand || !oldModel || !oldCondition) {
      return NextResponse.json(
        { error: 'Old phone brand, model, and condition are required' },
        { status: 400 }
      )
    }

    if (newVariantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: newVariantId } })
      if (!variant || !variant.isActive) {
        return NextResponse.json({ error: 'Selected new phone is not available' }, { status: 400 })
      }
    }

    const requestNumber = generateRequestNumber('exchange')

    const exchangeRequest = await prisma.exchangeRequest.create({
      data: {
        requestNumber,
        userId: session?.user?.id || null,
        oldBrand,
        oldModel,
        oldStorage: oldStorage || null,
        oldRam: oldRam || null,
        oldCondition,
        newVariantId: newVariantId || null,
        oldDeviceDetails: JSON.stringify(oldDeviceDetails || {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        newVariant: true,
      },
    })

    return NextResponse.json(
      { message: 'Exchange request created', exchangeRequest },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/exchange-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
