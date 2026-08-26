import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') || 'day'

    const where: Record<string, unknown> = { status: { not: 'CANCELLED' } }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
    }

    const orders = await prisma.order.findMany({
      where,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const grouped: Record<string, number> = {}

    for (const order of orders) {
      let key: string
      const date = order.createdAt

      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        key = startOfWeek.toISOString().split('T')[0]
      } else {
        key = date.toISOString().split('T')[0]
      }

      grouped[key] = (grouped[key] || 0) + order.total
    }

    const salesData = Object.entries(grouped).map(([date, sales]) => ({
      date,
      sales: Math.round(sales * 100) / 100,
      orders: orders.filter((o) => o.createdAt.toISOString().split('T')[0] === date).length,
    }))

    const totalSales = orders.reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json({
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders: orders.length,
      data: salesData,
    })
  } catch (error) {
    console.error('GET /api/analytics/sales error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
