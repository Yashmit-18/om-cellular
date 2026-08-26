import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const group = searchParams.get('group') || undefined

    const where: Record<string, unknown> = {}
    if (group) where.group = group

    const settings = await prisma.setting.findMany({
      where,
      orderBy: { key: 'asc' },
    })

    const PUBLIC_PREFIXES = ['business_', 'social_']
    const PUBLIC_EXACT = new Set(['website_logo', 'website_favicon', 'tax_rate', 'free_shipping_threshold', 'standard_shipping_price', 'express_shipping_price'])

    const publicSettings = settings.filter((s) =>
      PUBLIC_PREFIXES.some((p) => s.key.startsWith(p)) || PUBLIC_EXACT.has(s.key)
    )

    return NextResponse.json({ settings: publicSettings })
  } catch (error) {
    console.error('GET /api/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { settings } = body

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings array is required' }, { status: 400 })
    }

    const updates = await Promise.all(
      settings.map((item: { key: string; value: string; group?: string }) =>
        prisma.setting.upsert({
          where: { key: item.key },
          update: { value: item.value, group: item.group || undefined },
          create: { key: item.key, value: item.value, group: item.group || null },
        })
      )
    )

    return NextResponse.json({ message: 'Settings updated', settings: updates })
  } catch (error) {
    console.error('PUT /api/settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
