import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: { where: { isActive: true }, take: 20 } },
    })
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    return NextResponse.json({ category })
  } catch (error) {
    console.error('GET /api/categories/[id] error:', error)
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
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        image: body.image !== undefined ? body.image : existing.image,
        icon: body.icon !== undefined ? body.icon : existing.icon,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Category updated', category })
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error)
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
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    await prisma.category.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'Category deactivated' })
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
