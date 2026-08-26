import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const category = searchParams.get('category') || undefined
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { isActive: true }
    if (category) where.category = category

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.fAQ.count({ where }),
    ])

    return NextResponse.json({ faqs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/faqs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const { question, answer, category, sortOrder } = body

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      )
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        category: category || null,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({ message: 'FAQ created', faq }, { status: 201 })
  } catch (error) {
    console.error('POST /api/faqs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
