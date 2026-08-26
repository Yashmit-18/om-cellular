import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const contactRequest = await prisma.contactRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!contactRequest) return NextResponse.json({ error: 'Contact request not found' }, { status: 404 })
    return NextResponse.json({ contactRequest })
  } catch (error) {
    console.error('GET /api/contact-requests/[id] error:', error)
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

    const existing = await prisma.contactRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Contact request not found' }, { status: 404 })

    const contactRequest = await prisma.contactRequest.update({
      where: { id },
      data: {
        status: body.status ?? existing.status,
        adminNotes: body.adminNotes !== undefined ? body.adminNotes : existing.adminNotes,
      },
    })

    return NextResponse.json({ message: 'Contact request updated', contactRequest })
  } catch (error) {
    console.error('PUT /api/contact-requests/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
