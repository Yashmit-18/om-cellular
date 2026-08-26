import { NextRequest, NextResponse } from 'next/server'
import { calculateValuation } from '@/server/valuation/valuation.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, bodyCondition, cameraCondition, accessoriesAvailable, originalBill, originalBox } = body

    if (!brand || !model) {
      return NextResponse.json({ error: 'Brand and model are required' }, { status: 400 })
    }

    const result = await calculateValuation({
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
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/phone-valuations/calculate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
