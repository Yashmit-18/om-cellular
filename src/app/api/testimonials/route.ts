import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.testimonial.count({ where: { isActive: true } }),
    ])

    return NextResponse.json({ testimonials, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/testimonials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { customerName, customerImage, rating, comment, sortOrder } = body

    if (!customerName || !rating || !comment) {
      return NextResponse.json(
        { error: 'Customer name, rating, and comment are required' },
        { status: 400 }
      )
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        customerName,
        customerImage: customerImage || null,
        rating,
        comment,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({ message: 'Testimonial created', testimonial }, { status: 201 })
  } catch (error) {
    console.error('POST /api/testimonials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
