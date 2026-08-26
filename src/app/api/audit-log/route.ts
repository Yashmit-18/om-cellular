import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { admin: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ])

    return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/audit-log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { action, entity, entityId, oldValue, newValue, ipAddress } = body

    if (!action || !entity) {
      return NextResponse.json({ error: 'Action and entity are required' }, { status: 400 })
    }

    const log = await prisma.auditLog.create({
      data: {
        adminId: auth.user.id,
        action,
        entity,
        entityId: entityId || null,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        ipAddress: ipAddress || null,
      },
    })

    return NextResponse.json({ message: 'Audit log created', log }, { status: 201 })
  } catch (error) {
    console.error('POST /api/audit-log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
