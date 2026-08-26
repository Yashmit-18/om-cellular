import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { id } = await params

    const sellRequest = await prisma.sellRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    })

    if (!sellRequest) {
      return NextResponse.json({ error: 'Sell request not found' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && sellRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ sellRequest })
  } catch (error) {
    console.error('GET /api/sell-requests/[id] error:', error)
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

    const existing = await prisma.sellRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Sell request not found' }, { status: 404 })
    }

    const sellRequest = await prisma.sellRequest.update({
      where: { id },
      data: {
        status: body.status ?? existing.status,
        finalOfferedPrice: body.finalOfferedPrice !== undefined ? body.finalOfferedPrice : existing.finalOfferedPrice,
        adminNotes: body.adminNotes !== undefined ? body.adminNotes : existing.adminNotes,
        pickupAddress: body.pickupAddress !== undefined ? body.pickupAddress : existing.pickupAddress,
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : existing.pickupDate,
        pickupTime: body.pickupTime !== undefined ? body.pickupTime : existing.pickupTime,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ message: 'Sell request updated', sellRequest })
  } catch (error) {
    console.error('PUT /api/sell-requests/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
