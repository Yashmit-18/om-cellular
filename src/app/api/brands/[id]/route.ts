import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { products: { where: { isActive: true }, take: 20 } },
    })
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    return NextResponse.json({ brand })
  } catch (error) {
    console.error('GET /api/brands/[id] error:', error)
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
    const existing = await prisma.brand.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        logo: body.logo !== undefined ? body.logo : existing.logo,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Brand updated', brand })
  } catch (error) {
    console.error('PUT /api/brands/[id] error:', error)
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
    const existing = await prisma.brand.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    await prisma.brand.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Brand deactivated' })
  } catch (error) {
    console.error('DELETE /api/brands/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
