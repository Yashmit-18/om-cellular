import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const [cards, total] = await Promise.all([
      prisma.informationCard.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.informationCard.count({ where: { isActive: true } }),
    ])

    return NextResponse.json({ cards, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/information-cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { title, description, icon, image, ctaText, ctaLink, sortOrder } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const card = await prisma.informationCard.create({
      data: {
        title,
        description: description || null,
        icon: icon || null,
        image: image || null,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({ message: 'Information card created', card }, { status: 201 })
  } catch (error) {
    console.error('POST /api/information-cards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
