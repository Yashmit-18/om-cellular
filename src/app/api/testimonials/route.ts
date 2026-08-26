import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getActiveTestimonials } from '@/server/cms/cms.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getActiveTestimonials({ page, limit })

    return NextResponse.json(result)
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
