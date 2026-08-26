import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createRepairBooking, getRepairBookings } from '@/server/repairs/repair.service'

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

    const result = await getRepairBookings({
      userId: session.user.id,
      isAdmin,
      page,
      limit,
      status,
      search,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/repairs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const body = await request.json()
    const { serviceId, brand, model, problemDescription, pickupRequired, pickupAddress, appointmentDate, appointmentTime } = body

    if (!brand || !model) {
      return NextResponse.json(
        { error: 'Brand and model are required' },
        { status: 400 }
      )
    }

    const repair = await createRepairBooking({
      userId: session.user.id,
      serviceId,
      brand,
      model,
      problemDescription,
      pickupRequired,
      pickupAddress,
      appointmentDate,
      appointmentTime,
    })

    return NextResponse.json(
      { message: 'Repair booking created', repair },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/repairs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
