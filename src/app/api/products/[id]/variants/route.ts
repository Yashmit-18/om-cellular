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

    const variants = await prisma.productVariant.findMany({
      where: isAdmin ? { productId: id } : { productId: id, isActive: true },
      include: { inventory: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ variants })
  } catch (error) {
    console.error('GET /api/products/[id]/variants error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const { name, sku, price, discountPrice, stock, ram, storage, color, condition, batteryHealth, images, specifications, whatsIncluded, isRefurbished, featured, badge } = body

    if (!name || !sku || price === undefined) {
      return NextResponse.json({ error: 'Name, SKU, and price are required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const existingSku = await prisma.productVariant.findUnique({ where: { sku } })
    if (existingSku) return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        name,
        sku,
        price,
        discountPrice: discountPrice || null,
        stock: stock || 0,
        ram: ram || null,
        storage: storage || null,
        color: color || null,
        condition: condition || null,
        batteryHealth: batteryHealth || null,
        images: JSON.stringify(images || []),
        specifications: JSON.stringify(specifications || []),
        whatsIncluded: JSON.stringify(whatsIncluded || []),
        isRefurbished: isRefurbished || false,
        featured: featured || false,
        badge: badge || null,
      },
    })

    return NextResponse.json({ message: 'Variant created', variant }, { status: 201 })
  } catch (error) {
    console.error('POST /api/products/[id]/variants error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
