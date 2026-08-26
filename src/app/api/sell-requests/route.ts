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
          { brand: { contains: search } },
          { model: { contains: search } },
          { user: { name: { contains: search } } },
        ]
      }
      const skip = (page - 1) * limit
      const [requests, total] = await Promise.all([
        prisma.sellRequest.findMany({
          where,
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.sellRequest.count({ where }),
      ])
      return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) })
    }

    const [requests, total] = await Promise.all([
      prisma.sellRequest.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellRequest.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/sell-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  try {
    const body = await request.json()
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox, pickupAddress, pickupDate, pickupTime } = body

    if (!brand || !model || !condition) {
      return NextResponse.json(
        { error: 'Brand, model, and condition are required' },
        { status: 400 }
      )
    }

    const requestNumber = generateRequestNumber('sell')

    const sellRequest = await prisma.sellRequest.create({
      data: {
        requestNumber,
        userId: session?.user?.id || null,
        brand,
        model,
        storage: storage || null,
        ram: ram || null,
        age: age || null,
        condition,
        displayCondition: displayCondition || null,
        batteryCondition: batteryCondition || null,
        cameraCondition: cameraCondition || null,
        bodyCondition: bodyCondition || null,
        accessoriesAvailable: accessoriesAvailable || false,
        originalBill: originalBill || false,
        originalBox: originalBox || false,
        pickupAddress: pickupAddress || null,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        pickupTime: pickupTime || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      { message: 'Sell request created', sellRequest },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/sell-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
