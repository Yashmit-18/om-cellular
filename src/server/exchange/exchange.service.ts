import "server-only"
import { prisma } from '@/lib/db'
import { generateRequestNumber } from '@/lib/utils'

export async function createExchangeRequest(params: {
  userId?: string
  oldBrand: string
  oldModel: string
  oldStorage?: string
  oldRam?: string
  oldCondition: string
  newVariantId?: string
  oldDeviceDetails?: Record<string, unknown>
}) {
  const { userId, oldBrand, oldModel, oldStorage, oldRam, oldCondition, newVariantId, oldDeviceDetails } = params

  if (!oldBrand || !oldModel || !oldCondition) {
    throw new Error('Old phone brand, model, and condition are required')
  }

  if (newVariantId) {
    const variant = await prisma.productVariant.findUnique({ where: { id: newVariantId } })
    if (!variant || !variant.isActive) {
      throw new Error('Selected new phone is not available')
    }
  }

  const requestNumber = generateRequestNumber('exchange')

  const exchangeRequest = await prisma.exchangeRequest.create({
    data: {
      requestNumber,
      userId: userId || null,
      oldBrand,
      oldModel,
      oldStorage: oldStorage || null,
      oldRam: oldRam || null,
      oldCondition,
      newVariantId: newVariantId || null,
      oldDeviceDetails: JSON.stringify(oldDeviceDetails || {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      newVariant: true,
    },
  })

  return exchangeRequest
}

export async function getExchangeRequests(params: {
  userId?: string
  isAdmin?: boolean
  page?: number
  limit?: number
  status?: string
  search?: string
}) {
  const { userId, isAdmin = false, page = 1, limit = 20, status, search } = params
  const skip = (page - 1) * limit

  if (isAdmin) {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { requestNumber: { contains: search } },
        { oldBrand: { contains: search } },
        { oldModel: { contains: search } },
        { user: { name: { contains: search } } },
      ]
    }

    const [requests, total] = await Promise.all([
      prisma.exchangeRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          newVariant: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.exchangeRequest.count({ where }),
    ])

    return { requests, total, page, totalPages: Math.ceil(total / limit) }
  }

  if (!userId) {
    throw new Error('userId is required for non-admin queries')
  }

  const [requests, total] = await Promise.all([
    prisma.exchangeRequest.findMany({
      where: { userId },
      include: { newVariant: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.exchangeRequest.count({ where: { userId } }),
  ])

  return { requests, total, page, totalPages: Math.ceil(total / limit) }
}
