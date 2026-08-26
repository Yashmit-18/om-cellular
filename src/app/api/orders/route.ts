import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { getOrders, createOrder } from '@/server/orders/order.service'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await getOrders({ status, search, startDate, endDate, page, limit })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const body = await request.json()
    const { address, addressId, items, couponCode, paymentMethod, notes } = body

    const userId = session.user.id

    if (!items || !items.length) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    const order = await createOrder({
      userId,
      items,
      addressId,
      address,
      couponCode,
      paymentMethod,
      notes,
    })

    return NextResponse.json(
      { message: 'Order created successfully', order },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
