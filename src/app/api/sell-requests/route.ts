import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAuth } from '@/lib/auth'
import { createSellRequest, getSellRequests } from '@/server/sell/sell.service'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined

    const isAdmin = session.user.role === 'ADMIN'

    const result = await getSellRequests({
      userId: session.user.id,
      isAdmin,
      page,
      limit,
      status,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/sell-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  try {
    const body = await request.json()
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, cameraCondition, bodyCondition, accessoriesAvailable, originalBill, originalBox, pickupAddress, pickupDate, pickupTime } = body

    if (!brand || !model || !condition) {
      return NextResponse.json(
        { error: 'Brand, model, and condition are required' },
        { status: 400 }
      )
    }

    const sellRequest = await createSellRequest({
      userId: session?.user?.id,
      brand,
      model,
      storage,
      ram,
      age,
      condition,
      displayCondition,
      batteryCondition,
      cameraCondition,
      bodyCondition,
      accessoriesAvailable,
      originalBill,
      originalBox,
      pickupAddress,
      pickupDate,
      pickupTime,
    })

    return NextResponse.json(
      { message: 'Sell request created', sellRequest },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/sell-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
