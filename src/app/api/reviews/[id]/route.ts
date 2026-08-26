import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.review.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

    const review = await prisma.review.update({
      where: { id },
      data: {
        isApproved: body.isApproved ?? existing.isApproved,
        isAdminReply: body.isAdminReply ?? existing.isAdminReply,
        rating: body.rating ?? existing.rating,
        title: body.title !== undefined ? body.title : existing.title,
        comment: body.comment !== undefined ? body.comment : existing.comment,
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ message: 'Review updated', review })
  } catch (error) {
    console.error('PUT /api/reviews/[id] error:', error)
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
    const existing = await prisma.review.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    await prisma.review.delete({ where: { id } })
    return NextResponse.json({ message: 'Review deleted' })
  } catch (error) {
    console.error('DELETE /api/reviews/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
