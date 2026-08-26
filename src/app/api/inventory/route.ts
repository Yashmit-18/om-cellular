import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (lowStock) {
      where.OR = [
        { quantity: { lte: 5 } },
        { reservedQuantity: { gt: 0 } },
      ]
    }

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ])

    return NextResponse.json({ inventory, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/inventory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 })
    }

    const results = await Promise.all(
      updates.map((item: { variantId: string; quantity?: number; reservedQuantity?: number; lowStockThreshold?: number }) =>
        prisma.inventory.upsert({
          where: { variantId: item.variantId },
          update: {
            ...(item.quantity !== undefined && { quantity: item.quantity }),
            ...(item.reservedQuantity !== undefined && { reservedQuantity: item.reservedQuantity }),
            ...(item.lowStockThreshold !== undefined && { lowStockThreshold: item.lowStockThreshold }),
          },
          create: {
            variantId: item.variantId,
            quantity: item.quantity || 0,
            reservedQuantity: item.reservedQuantity || 0,
            lowStockThreshold: item.lowStockThreshold || 5,
          },
        })
      )
    )

    return NextResponse.json({ message: 'Inventory updated', inventory: results })
  } catch (error) {
    console.error('PUT /api/inventory error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
