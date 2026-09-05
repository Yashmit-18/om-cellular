import { Notification } from '../models/notification.model'

export interface NotificationInput {
  userId: string
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
}

export const NOTIFICATION_TYPES = [
  'ORDER', 'PAYMENT', 'SHIPMENT', 'REFUND', 'CANCELLATION',
  'REPAIR', 'SELL', 'EXCHANGE', 'RETURN', 'SERVICEABILITY', 'ACCOUNT', 'ANNOUNCEMENT',
] as const

// Creates a single in-app notification. Best effort — failures are swallowed so
// notification issues never break the underlying business operation.
export async function notify(input: NotificationInput): Promise<void> {
  try {
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
    })
  } catch (error) {
    console.error('Notification create failed:', (error as Error)?.message || error)
  }
}

// Broadcasts an announcement to either every customer or a targeted list of
// user ids. Persons are resolved from the User collection so the caller never
// needs to pass the full audience, and only safe metadata is retained.
export async function broadcastNotification(input: {
  type: string
  title: string
  message: string
  userIds?: string[]
  metadata?: Record<string, unknown>
}): Promise<{ delivered: number }> {
  try {
    const { type, title, message, metadata, userIds } = input
    let targets: string[]
    if (Array.isArray(userIds) && userIds.length) {
      targets = userIds
    } else {
      const { User } = await import('../models/user.model')
      const customers = await User.find({ role: 'CUSTOMER' }).select('_id').lean()
      targets = customers.map((c: any) => String(c._id))
    }

    if (!targets.length) return { delivered: 0 }

    await Notification.insertMany(
      targets.map((userId) => ({ userId, type, title, message, metadata: metadata || {} }))
    )
    return { delivered: targets.length }
  } catch (error) {
    console.error('Broadcast notification failed:', (error as Error)?.message || error)
    return { delivered: 0 }
  }
}