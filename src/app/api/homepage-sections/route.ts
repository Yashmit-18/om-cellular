import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const sections = await prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ sections })
  } catch (error) {
    console.error('GET /api/homepage-sections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { title, subtitle, type, productIds, ctaText, ctaLink, image, sortOrder, background } = body

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 })
    }

    const section = await prisma.homepageSection.create({
      data: {
        title,
        subtitle: subtitle || null,
        type,
        productIds: JSON.stringify(productIds || []),
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        image: image || null,
        sortOrder: sortOrder || 0,
        background: background || null,
      },
    })

    return NextResponse.json({ message: 'Section created', section }, { status: 201 })
  } catch (error) {
    console.error('POST /api/homepage-sections error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
