import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAdmin, getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { subject: { contains: search } },
      ]
    }

    const [requests, total] = await Promise.all([
      prisma.contactRequest.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactRequest.count({ where }),
    ])

    return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/contact-requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        userId: session?.user?.id || null,
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
      },
    })

    return NextResponse.json(
      { message: 'Contact request submitted', contactRequest },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/contact-requests error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
