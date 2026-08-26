import "server-only"
import { prisma } from '@/lib/db'

export async function getActiveBanners() {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return banners
}

export async function getActiveHomepageSections() {
  const sections = await prisma.homepageSection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return sections
}

export async function getActiveTestimonials(params?: {
  page?: number
  limit?: number
}) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const skip = (page - 1) * limit

  const [testimonials, total] = await Promise.all([
    prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      skip,
      take: limit,
    }),
    prisma.testimonial.count({ where: { isActive: true } }),
  ])

  return {
    testimonials,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getActiveFAQs(params?: {
  page?: number
  limit?: number
  category?: string
}) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 50
  const category = params?.category
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

  return {
    faqs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
