import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testimonial = await prisma.testimonial.findUnique({ where: { id } })
    if (!testimonial) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
    return NextResponse.json({ testimonial })
  } catch (error) {
    console.error('GET /api/testimonials/[id] error:', error)
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
    const existing = await prisma.testimonial.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        customerName: body.customerName ?? existing.customerName,
        customerImage: body.customerImage !== undefined ? body.customerImage : existing.customerImage,
        rating: body.rating ?? existing.rating,
        comment: body.comment ?? existing.comment,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Testimonial updated', testimonial })
  } catch (error) {
    console.error('PUT /api/testimonials/[id] error:', error)
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
    const existing = await prisma.testimonial.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
    await prisma.testimonial.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Testimonial deactivated' })
  } catch (error) {
    console.error('DELETE /api/testimonials/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
