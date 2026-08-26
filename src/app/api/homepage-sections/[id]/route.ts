import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const section = await prisma.homepageSection.findUnique({ where: { id } })
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    return NextResponse.json({ section })
  } catch (error) {
    console.error('GET /api/homepage-sections/[id] error:', error)
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
    const existing = await prisma.homepageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

    const section = await prisma.homepageSection.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        subtitle: body.subtitle !== undefined ? body.subtitle : existing.subtitle,
        type: body.type ?? existing.type,
        productIds: body.productIds ? JSON.stringify(body.productIds) : existing.productIds,
        ctaText: body.ctaText !== undefined ? body.ctaText : existing.ctaText,
        ctaLink: body.ctaLink !== undefined ? body.ctaLink : existing.ctaLink,
        image: body.image !== undefined ? body.image : existing.image,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        background: body.background !== undefined ? body.background : existing.background,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Section updated', section })
  } catch (error) {
    console.error('PUT /api/homepage-sections/[id] error:', error)
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
    const existing = await prisma.homepageSection.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    await prisma.homepageSection.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Section deactivated' })
  } catch (error) {
    console.error('DELETE /api/homepage-sections/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
