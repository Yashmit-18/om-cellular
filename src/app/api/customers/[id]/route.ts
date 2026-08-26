import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true,
        orders: { include: { items: { include: { variant: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        repairBookings: { include: { service: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        sellRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
        exchangeRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json({ customer })
  } catch (error) {
    console.error('GET /api/customers/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
