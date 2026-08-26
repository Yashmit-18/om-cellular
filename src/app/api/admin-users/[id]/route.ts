import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params

    const admin = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, createdAt: true, updatedAt: true,
      },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('GET /api/admin-users/[id] error:', error)
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

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      name: body.name ?? existing.name,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      role: body.role ?? existing.role,
    }

    if (body.email && body.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      })
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
      updateData.email = body.email.toLowerCase().trim()
    }

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 12)
    }

    const admin = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, createdAt: true, updatedAt: true,
      },
    })

    return NextResponse.json({ message: 'Admin user updated', admin })
  } catch (error) {
    console.error('PUT /api/admin-users/[id] error:', error)
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

    if (id === auth.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: 'Admin user deleted' })
  } catch (error) {
    console.error('DELETE /api/admin-users/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
