import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { slugify } from '@/lib/utils'

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('GET /api/brands error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { name, logo, sortOrder } = body

    if (!name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    let slug = slugify(name)
    const existing = await prisma.brand.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        logo: logo || null,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({ message: 'Brand created', brand }, { status: 201 })
  } catch (error) {
    console.error('POST /api/brands error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
