import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const banner = await prisma.banner.findUnique({ where: { id } })
    if (!banner) return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    return NextResponse.json({ banner })
  } catch (error) {
    console.error('GET /api/banners/[id] error:', error)
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
    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Banner not found' }, { status: 404 })

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        subtitle: body.subtitle !== undefined ? body.subtitle : existing.subtitle,
        image: body.image ?? existing.image,
        ctaText: body.ctaText !== undefined ? body.ctaText : existing.ctaText,
        ctaLink: body.ctaLink !== undefined ? body.ctaLink : existing.ctaLink,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : existing.startDate,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate,
      },
    })

    return NextResponse.json({ message: 'Banner updated', banner })
  } catch (error) {
    console.error('PUT /api/banners/[id] error:', error)
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
    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Banner not found' }, { status: 404 })
    await prisma.banner.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Banner deactivated' })
  } catch (error) {
    console.error('DELETE /api/banners/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
