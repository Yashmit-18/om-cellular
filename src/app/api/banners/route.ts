import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getActiveBanners } from '@/server/cms/cms.service'

export async function GET() {
  try {
    const banners = await getActiveBanners()
    return NextResponse.json({ banners })
  } catch (error) {
    console.error('GET /api/banners error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { title, subtitle, image, ctaText, ctaLink, sortOrder, startDate, endDate } = body

    if (!title || !image) {
      return NextResponse.json({ error: 'Title and image are required' }, { status: 400 })
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        image,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        sortOrder: sortOrder || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    return NextResponse.json({ message: 'Banner created', banner }, { status: 201 })
  } catch (error) {
    console.error('POST /api/banners error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
