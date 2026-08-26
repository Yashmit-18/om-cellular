import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalSales,
      todaySales,
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRepairs,
      pendingRepairs,
      totalSellRequests,
      pendingSellRequests,
      totalExchangeRequests,
      pendingExchangeRequests,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      recentSales,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.repairBooking.count(),
      prisma.repairBooking.count({ where: { status: { in: ['BOOKING_RECEIVED', 'IN_DIAGNOSIS', 'IN_REPAIR'] } } }),
      prisma.sellRequest.count(),
      prisma.sellRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.exchangeRequest.count(),
      prisma.exchangeRequest.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productVariant.findMany({
        where: { isActive: true, stock: { lte: 5 } },
        select: { id: true, name: true, stock: true, sku: true },
        take: 10,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } },
        select: { total: true, createdAt: true },
      }),
    ])

    const salesByDay: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      salesByDay[key] = 0
    }

    for (const order of recentSales) {
      const key = order.createdAt.toISOString().split('T')[0]
      if (key in salesByDay) {
        salesByDay[key] += order.total
      }
    }

    const chartData = Object.entries(salesByDay).map(([date, sales]) => ({
      date,
      sales: Math.round(sales * 100) / 100,
    }))

    return NextResponse.json({
      totalSales: totalSales._sum.total || 0,
      todaySales: todaySales._sum.total || 0,
      orders: { total: totalOrders, pending: pendingOrders, completed: completedOrders },
      repairs: { total: totalRepairs, pending: pendingRepairs },
      sellRequests: { total: totalSellRequests, pending: pendingSellRequests },
      exchangeRequests: { total: totalExchangeRequests, pending: pendingExchangeRequests },
      customers: totalCustomers,
      products: totalProducts,
      lowStockProducts,
      chartData,
    })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
