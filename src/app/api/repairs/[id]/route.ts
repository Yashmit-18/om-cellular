import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { id } = await params

    const repair = await prisma.repairBooking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!repair) {
      return NextResponse.json({ error: 'Repair booking not found' }, { status: 404 })
    }

    if (session.user.role !== 'ADMIN' && repair.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ repair })
  } catch (error) {
    console.error('GET /api/repairs/[id] error:', error)
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

    const existing = await prisma.repairBooking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Repair booking not found' }, { status: 404 })
    }

    const statusChanged = body.status && body.status !== existing.status

    const repair = await prisma.$transaction(async (tx) => {
      const updated = await tx.repairBooking.update({
        where: { id },
        data: {
          status: body.status ?? existing.status,
          technicianName: body.technicianName !== undefined ? body.technicianName : existing.technicianName,
          technicianNotes: body.technicianNotes !== undefined ? body.technicianNotes : existing.technicianNotes,
          estimatedCost: body.estimatedCost !== undefined ? body.estimatedCost : existing.estimatedCost,
          finalCost: body.finalCost !== undefined ? body.finalCost : existing.finalCost,
          pickupRequired: body.pickupRequired ?? existing.pickupRequired,
          pickupAddress: body.pickupAddress !== undefined ? body.pickupAddress : existing.pickupAddress,
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : existing.appointmentDate,
          appointmentTime: body.appointmentTime !== undefined ? body.appointmentTime : existing.appointmentTime,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          service: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      })

      if (statusChanged) {
        await tx.repairStatusHistory.create({
          data: {
            repairId: id,
            status: body.status,
            note: body.statusNote || `Status updated to ${body.status}`,
          },
        })
      }

      return updated
    })

    return NextResponse.json({ message: 'Repair updated', repair })
  } catch (error) {
    console.error('PUT /api/repairs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
