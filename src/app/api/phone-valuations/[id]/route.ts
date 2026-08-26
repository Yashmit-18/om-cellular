import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const valuation = await prisma.phoneValuation.findUnique({ where: { id } })
    if (!valuation) return NextResponse.json({ error: 'Valuation not found' }, { status: 404 })
    return NextResponse.json({ valuation })
  } catch (error) {
    console.error('GET /api/phone-valuations/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const existing = await prisma.phoneValuation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Valuation not found' }, { status: 404 })

    const valuation = await prisma.phoneValuation.update({
      where: { id },
      data: {
        brand: body.brand ?? existing.brand,
        model: body.model ?? existing.model,
        baseValue: body.baseValue ?? existing.baseValue,
        storageAdjustment: body.storageAdjustment ? JSON.stringify(body.storageAdjustment) : existing.storageAdjustment,
        ramAdjustment: body.ramAdjustment ? JSON.stringify(body.ramAdjustment) : existing.ramAdjustment,
        ageDepreciation: body.ageDepreciation ? JSON.stringify(body.ageDepreciation) : existing.ageDepreciation,
        conditionMultiplier: body.conditionMultiplier ? JSON.stringify(body.conditionMultiplier) : existing.conditionMultiplier,
        displayDeduction: body.displayDeduction ?? existing.displayDeduction,
        batteryDeduction: body.batteryDeduction ?? existing.batteryDeduction,
        bodyDeduction: body.bodyDeduction ?? existing.bodyDeduction,
        cameraDeduction: body.cameraDeduction ?? existing.cameraDeduction,
        accessoryDeduction: body.accessoryDeduction ?? existing.accessoryDeduction,
        billDeduction: body.billDeduction ?? existing.billDeduction,
        boxDeduction: body.boxDeduction ?? existing.boxDeduction,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'Valuation updated', valuation })
  } catch (error) {
    console.error('PUT /api/phone-valuations/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const existing = await prisma.phoneValuation.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Valuation not found' }, { status: 404 })
    await prisma.phoneValuation.delete({ where: { id } })
    return NextResponse.json({ message: 'Valuation deleted' })
  } catch (error) {
    console.error('DELETE /api/phone-valuations/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
