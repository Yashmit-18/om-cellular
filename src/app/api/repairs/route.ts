import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { generateRepairBookingNumber } from '@/lib/utils'

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
          { bookingNumber: { contains: search } },
          { brand: { contains: search } },
          { model: { contains: search } },
          { user: { name: { contains: search } } },
        ]
      }
      const skip = (page - 1) * limit
      const [repairs, total] = await Promise.all([
        prisma.repairBooking.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            service: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.repairBooking.count({ where }),
      ])
      return NextResponse.json({ repairs, total, page, totalPages: Math.ceil(total / limit) })
    }

    const [repairs, total] = await Promise.all([
      prisma.repairBooking.findMany({
        where: { userId: session.user.id },
        include: {
          service: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repairBooking.count({ where: { userId: session.user.id } }),
    ])

    return NextResponse.json({ repairs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/repairs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const body = await request.json()
    const { serviceId, brand, model, problemDescription, pickupRequired, pickupAddress, appointmentDate, appointmentTime } = body

    if (!brand || !model) {
      return NextResponse.json(
        { error: 'Brand and model are required' },
        { status: 400 }
      )
    }

    const bookingNumber = generateRepairBookingNumber()

    const repair = await prisma.repairBooking.create({
      data: {
        bookingNumber,
        userId: session.user.id,
        serviceId: serviceId || null,
        brand,
        model,
        problemDescription: problemDescription || null,
        pickupRequired: pickupRequired || false,
        pickupAddress: pickupAddress || null,
        appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
        appointmentTime: appointmentTime || null,
        statusHistory: {
          create: {
            status: 'BOOKING_RECEIVED',
            note: 'Booking received',
          },
        },
      },
      include: {
        service: true,
        statusHistory: true,
      },
    })

    return NextResponse.json(
      { message: 'Repair booking created', repair },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/repairs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
