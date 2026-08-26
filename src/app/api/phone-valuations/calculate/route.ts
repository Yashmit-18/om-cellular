import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brand, model, storage, ram, age, condition, displayCondition, batteryCondition, bodyCondition, cameraCondition, accessoriesAvailable, originalBill, originalBox } = body

    if (!brand || !model) {
      return NextResponse.json({ error: 'Brand and model are required' }, { status: 400 })
    }

    const valuation = await prisma.phoneValuation.findUnique({
      where: { brand_model: { brand, model } },
    })

    if (!valuation || !valuation.isActive) {
      return NextResponse.json(
        { error: 'Valuation not available for this phone model. Please contact us for an estimate.' },
        { status: 404 }
      )
    }

    let estimatedValue = valuation.baseValue

    const storageAdj = JSON.parse(valuation.storageAdjustment) as Record<string, number>
    if (storage && storageAdj[storage]) {
      estimatedValue += storageAdj[storage]
    }

    const ramAdj = JSON.parse(valuation.ramAdjustment) as Record<string, number>
    if (ram && ramAdj[ram]) {
      estimatedValue += ramAdj[ram]
    }

    const ageDepr = JSON.parse(valuation.ageDepreciation) as Record<string, number>
    if (age && ageDepr[age]) {
      estimatedValue -= ageDepr[age]
    }

    const condMult = JSON.parse(valuation.conditionMultiplier) as Record<string, number>
    if (condition && condMult[condition]) {
      estimatedValue *= condMult[condition]
    }

    if (displayCondition === 'damaged' || displayCondition === 'cracked') {
      estimatedValue -= valuation.displayDeduction
    }
    if (batteryCondition === 'poor' || batteryCondition === 'replacement') {
      estimatedValue -= valuation.batteryDeduction
    }
    if (bodyCondition === 'damaged' || bodyCondition === 'heavily_damaged') {
      estimatedValue -= valuation.bodyDeduction
    }
    if (cameraCondition === 'not_working' || cameraCondition === 'poor') {
      estimatedValue -= valuation.cameraDeduction
    }
    if (!accessoriesAvailable) {
      estimatedValue -= valuation.accessoryDeduction
    }
    if (!originalBill) {
      estimatedValue -= valuation.billDeduction
    }
    if (!originalBox) {
      estimatedValue -= valuation.boxDeduction
    }

    estimatedValue = Math.max(0, Math.round(estimatedValue))

    return NextResponse.json({
      estimatedValue,
      brand: valuation.brand,
      model: valuation.model,
      disclaimer: 'Estimated value is subject to physical inspection and final verification.',
    })
  } catch (error) {
    console.error('POST /api/phone-valuations/calculate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
