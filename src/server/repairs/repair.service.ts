import "server-only"
import { prisma } from '@/lib/db'
import { generateRepairBookingNumber } from '@/lib/utils'

export async function createRepairBooking(params: {
  userId: string
  serviceId?: string
  brand: string
  model: string
  problemDescription?: string
  pickupRequired?: boolean
  pickupAddress?: string
  appointmentDate?: Date | string
  appointmentTime?: string
}) {
  const { userId, serviceId, brand, model, problemDescription, pickupRequired, pickupAddress, appointmentDate, appointmentTime } = params

  if (!brand || !model) {
    throw new Error('Brand and model are required')
  }

  const bookingNumber = generateRepairBookingNumber()

  const repair = await prisma.repairBooking.create({
    data: {
      bookingNumber,
      userId,
      serviceId: serviceId || null,
      brand,
      model,
      problemDescription: problemDescription || null,
      pickupRequired: pickupRequired || false,
      pickupAddress: pickupAddress || null,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
      appointmentTime: appointmentTime || null,
      statusHistory: {
        create: {
          status: 'BOOKING_RECEIVED',
          note: 'Booking received',
        },
      },
    },
    include: {
      service: true,
      statusHistory: true,
    },
  })

  return repair
}

export async function getRepairBookings(params: {
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
        { bookingNumber: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
        { user: { name: { contains: search } } },
      ]
    }

    const [repairs, total] = await Promise.all([
      prisma.repairBooking.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          service: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.repairBooking.count({ where }),
    ])

    return { repairs, total, page, totalPages: Math.ceil(total / limit) }
  }

  if (!userId) {
    throw new Error('userId is required for non-admin queries')
  }

  const [repairs, total] = await Promise.all([
    prisma.repairBooking.findMany({
      where: { userId },
      include: {
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.repairBooking.count({ where: { userId } }),
  ])

  return { repairs, total, page, totalPages: Math.ceil(total / limit) }
}
