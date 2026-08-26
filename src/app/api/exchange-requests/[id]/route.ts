import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { id } = await params

    const exchangeRequest = await prisma.exchangeRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        newVariant: true,
      },
    })

    if (!exchangeRequest) {
      return NextResponse.json({ error: 'Exchange request not found' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && exchangeRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ exchangeRequest })
  } catch (error) {
    console.error('GET /api/exchange-requests/[id] error:', error)
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

    const existing = await prisma.exchangeRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Exchange request not found' }, { status: 404 })
    }

    const newPrice = body.finalExchangeValue !== undefined ? body.finalExchangeValue : existing.finalExchangeValue
    let difference = existing.difference
    if (newPrice !== undefined && newPrice !== null && existing.newVariantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: existing.newVariantId } })
      if (variant) {
        const newPhonePrice = variant.discountPrice || variant.price
        difference = newPhonePrice - (newPrice || 0)
      }
    }

    const exchangeRequest = await prisma.exchangeRequest.update({
      where: { id },
      data: {
        status: body.status ?? existing.status,
        estimatedExchangeValue: body.estimatedExchangeValue !== undefined ? body.estimatedExchangeValue : existing.estimatedExchangeValue,
        finalExchangeValue: newPrice,
        difference,
        newVariantId: body.newVariantId !== undefined ? body.newVariantId : existing.newVariantId,
        adminNotes: body.adminNotes !== undefined ? body.adminNotes : existing.adminNotes,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        newVariant: true,
      },
    })

    return NextResponse.json({ message: 'Exchange request updated', exchangeRequest })
  } catch (error) {
    console.error('PUT /api/exchange-requests/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
