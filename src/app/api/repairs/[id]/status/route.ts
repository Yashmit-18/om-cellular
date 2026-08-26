import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const body = await request.json()
    const { status, note } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const repair = await prisma.repairBooking.findUnique({ where: { id } })
    if (!repair) return NextResponse.json({ error: 'Repair booking not found' }, { status: 404 })

    const [statusHistory] = await prisma.$transaction([
      prisma.repairStatusHistory.create({
        data: { repairId: id, status, note: note || null },
      }),
      prisma.repairBooking.update({
        where: { id },
        data: { status },
      }),
    ])

    return NextResponse.json({ message: 'Status updated', statusHistory }, { status: 201 })
  } catch (error) {
    console.error('POST /api/repairs/[id]/status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
