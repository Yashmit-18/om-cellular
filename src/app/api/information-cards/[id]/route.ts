import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const card = await prisma.informationCard.findUnique({ where: { id } })
    if (!card) return NextResponse.json({ error: 'Information card not found' }, { status: 404 })
    return NextResponse.json({ card })
  } catch (error) {
    console.error('GET /api/information-cards/[id] error:', error)
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
    const existing = await prisma.informationCard.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Information card not found' }, { status: 404 })

    const card = await prisma.informationCard.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description !== undefined ? body.description : existing.description,
        icon: body.icon !== undefined ? body.icon : existing.icon,
        image: body.image !== undefined ? body.image : existing.image,
        ctaText: body.ctaText !== undefined ? body.ctaText : existing.ctaText,
        ctaLink: body.ctaLink !== undefined ? body.ctaLink : existing.ctaLink,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Information card updated', card })
  } catch (error) {
    console.error('PUT /api/information-cards/[id] error:', error)
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
    const existing = await prisma.informationCard.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Information card not found' }, { status: 404 })
    await prisma.informationCard.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Information card deactivated' })
  } catch (error) {
    console.error('DELETE /api/information-cards/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
