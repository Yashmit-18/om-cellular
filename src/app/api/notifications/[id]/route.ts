import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error
  const session = auth

  try {
    const { id } = await params

    const existing = await prisma.notification.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ message: 'Notification marked as read', notification })
  } catch (error) {
    console.error('PUT /api/notifications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
