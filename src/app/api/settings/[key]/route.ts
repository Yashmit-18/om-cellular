import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const setting = await prisma.setting.findUnique({ where: { key } })
    if (!setting) return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    return NextResponse.json({ setting })
  } catch (error) {
    console.error('GET /api/settings/[key] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { key } = await params
    const body = await request.json()
    const { value, group } = body

    if (value === undefined) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value, group: group || undefined },
      create: { key, value, group: group || null },
    })

    return NextResponse.json({ message: 'Setting updated', setting })
  } catch (error) {
    console.error('PUT /api/settings/[key] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
