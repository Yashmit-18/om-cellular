import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, variantId } = await params

    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!existing) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    if (existing.productId !== id) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

    const body = await request.json()

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: body.name ?? existing.name,
        price: body.price ?? existing.price,
        discountPrice: body.discountPrice !== undefined ? body.discountPrice : existing.discountPrice,
        stock: body.stock ?? existing.stock,
        ram: body.ram !== undefined ? body.ram : existing.ram,
        storage: body.storage !== undefined ? body.storage : existing.storage,
        color: body.color !== undefined ? body.color : existing.color,
        condition: body.condition !== undefined ? body.condition : existing.condition,
        batteryHealth: body.batteryHealth !== undefined ? body.batteryHealth : existing.batteryHealth,
        images: body.images ? JSON.stringify(body.images) : existing.images,
        specifications: body.specifications ? JSON.stringify(body.specifications) : existing.specifications,
        whatsIncluded: body.whatsIncluded ? JSON.stringify(body.whatsIncluded) : existing.whatsIncluded,
        isRefurbished: body.isRefurbished ?? existing.isRefurbished,
        featured: body.featured ?? existing.featured,
        badge: body.badge !== undefined ? body.badge : existing.badge,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Variant updated', variant })
  } catch (error) {
    console.error('PUT /api/products/[id]/variants/[variantId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id, variantId } = await params
    const existing = await prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!existing) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    if (existing.productId !== id) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } })
    return NextResponse.json({ message: 'Variant deactivated' })
  } catch (error) {
    console.error('DELETE /api/products/[id]/variants/[variantId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
