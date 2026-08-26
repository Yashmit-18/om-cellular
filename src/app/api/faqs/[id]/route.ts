import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const faq = await prisma.fAQ.findUnique({ where: { id } })
    if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    return NextResponse.json({ faq })
  } catch (error) {
    console.error('GET /api/faqs/[id] error:', error)
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
    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })

    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        question: body.question ?? existing.question,
        answer: body.answer ?? existing.answer,
        category: body.category !== undefined ? body.category : existing.category,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
    })

    return NextResponse.json({ message: 'FAQ updated', faq })
  } catch (error) {
    console.error('PUT /api/faqs/[id] error:', error)
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
    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    await prisma.fAQ.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ message: 'FAQ deactivated' })
  } catch (error) {
    console.error('DELETE /api/faqs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
