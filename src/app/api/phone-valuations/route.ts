import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const brand = searchParams.get('brand') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (brand) where.brand = brand
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
      ]
    }

    const [valuations, total] = await Promise.all([
      prisma.phoneValuation.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.phoneValuation.count({ where }),
    ])

    return NextResponse.json({ valuations, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/phone-valuations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const {
      brand, model, baseValue,
      storageAdjustment, ramAdjustment, ageDepreciation, conditionMultiplier,
      displayDeduction, batteryDeduction, bodyDeduction, cameraDeduction,
      accessoryDeduction, billDeduction, boxDeduction,
    } = body

    if (!brand || !model || baseValue === undefined) {
      return NextResponse.json(
        { error: 'Brand, model, and base value are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.phoneValuation.findUnique({
      where: { brand_model: { brand, model } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A valuation already exists for this brand and model' },
        { status: 409 }
      )
    }

    const valuation = await prisma.phoneValuation.create({
      data: {
        brand,
        model,
        baseValue,
        storageAdjustment: JSON.stringify(storageAdjustment || {}),
        ramAdjustment: JSON.stringify(ramAdjustment || {}),
        ageDepreciation: JSON.stringify(ageDepreciation || {}),
        conditionMultiplier: JSON.stringify(conditionMultiplier || {}),
        displayDeduction: displayDeduction || 0,
        batteryDeduction: batteryDeduction || 0,
        bodyDeduction: bodyDeduction || 0,
        cameraDeduction: cameraDeduction || 0,
        accessoryDeduction: accessoryDeduction || 0,
        billDeduction: billDeduction || 0,
        boxDeduction: boxDeduction || 0,
      },
    })

    return NextResponse.json({ message: 'Valuation created', valuation }, { status: 201 })
  } catch (error) {
    console.error('POST /api/phone-valuations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
