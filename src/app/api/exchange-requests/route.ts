import { NextRequest, NextResponse } from 'next/server'
import { getSession, requireAuth } from '@/lib/auth'
import { createExchangeRequest, getExchangeRequests } from '@/server/exchange/exchange.service'

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

    const result = await getExchangeRequests({
      userId: session.user.id,
      isAdmin,
      page,
      limit,
      status,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/exchange-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()

  try {
    const body = await request.json()
    const { oldBrand, oldModel, oldStorage, oldRam, oldCondition, newVariantId, oldDeviceDetails } = body

    if (!oldBrand || !oldModel || !oldCondition) {
      return NextResponse.json(
        { error: 'Old phone brand, model, and condition are required' },
        { status: 400 }
      )
    }

    const exchangeRequest = await createExchangeRequest({
      userId: session?.user?.id,
      oldBrand,
      oldModel,
      oldStorage,
      oldRam,
      oldCondition,
      newVariantId,
      oldDeviceDetails,
    })

    return NextResponse.json(
      { message: 'Exchange request created', exchangeRequest },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/exchange-requests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
