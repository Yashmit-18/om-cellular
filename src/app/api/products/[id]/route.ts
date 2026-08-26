import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin, getSession } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    const isAdmin = session?.user?.role === 'ADMIN'

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        variants: isAdmin ? true : { where: { isActive: true } },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
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

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        brandId: body.brandId !== undefined ? body.brandId : existing.brandId,
        categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
        isFeatured: body.isFeatured ?? existing.isFeatured,
        isNewArrival: body.isNewArrival ?? existing.isNewArrival,
        isBestSeller: body.isBestSeller ?? existing.isBestSeller,
        isRefurbished: body.isRefurbished ?? existing.isRefurbished,
        condition: body.condition ?? existing.condition,
        warranty: body.warranty ?? existing.warranty,
        returnPolicy: body.returnPolicy ?? existing.returnPolicy,
        seoTitle: body.seoTitle ?? existing.seoTitle,
        seoDescription: body.seoDescription ?? existing.seoDescription,
        seoKeywords: body.seoKeywords ?? existing.seoKeywords,
        isActive: body.isActive ?? existing.isActive,
      },
      include: {
        brand: true,
        category: true,
        variants: true,
      },
    })

    return NextResponse.json({ message: 'Product updated', product })
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error)
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

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Product deactivated' })
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
