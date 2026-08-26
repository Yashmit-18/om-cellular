import "server-only"
import { prisma } from '@/lib/db'
import { generateRequestNumber } from '@/lib/utils'

export async function createSellRequest(params: {
  userId?: string
  brand: string
  model: string
  storage?: string
  ram?: string
  age?: string
  condition: string
  displayCondition?: string
  batteryCondition?: string
  cameraCondition?: string
  bodyCondition?: string
  accessoriesAvailable?: boolean
  originalBill?: boolean
  originalBox?: boolean
  pickupAddress?: string
  pickupDate?: Date | string
  pickupTime?: string
}) {
  const {
    userId,
    brand,
    model,
    storage,
    ram,
    age,
    condition,
    displayCondition,
    batteryCondition,
    cameraCondition,
    bodyCondition,
    accessoriesAvailable,
    originalBill,
    originalBox,
    pickupAddress,
    pickupDate,
    pickupTime,
  } = params

  if (!brand || !model || !condition) {
    throw new Error('Brand, model, and condition are required')
  }

  const requestNumber = generateRequestNumber('sell')

  const sellRequest = await prisma.sellRequest.create({
    data: {
      requestNumber,
      userId: userId || null,
      brand,
      model,
      storage: storage || null,
      ram: ram || null,
      age: age || null,
      condition,
      displayCondition: displayCondition || null,
      batteryCondition: batteryCondition || null,
      cameraCondition: cameraCondition || null,
      bodyCondition: bodyCondition || null,
      accessoriesAvailable: accessoriesAvailable || false,
      originalBill: originalBill || false,
      originalBox: originalBox || false,
      pickupAddress: pickupAddress || null,
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      pickupTime: pickupTime || null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return sellRequest
}

export async function getSellRequests(params: {
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
        { brand: { contains: search } },
        { model: { contains: search } },
        { user: { name: { contains: search } } },
      ]
    }

    const [requests, total] = await Promise.all([
      prisma.sellRequest.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sellRequest.count({ where }),
    ])

    return { requests, total, page, totalPages: Math.ceil(total / limit) }
  }

  if (!userId) {
    throw new Error('userId is required for non-admin queries')
  }

  const [requests, total] = await Promise.all([
    prisma.sellRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sellRequest.count({ where: { userId } }),
  ])

  return { requests, total, page, totalPages: Math.ceil(total / limit) }
}
