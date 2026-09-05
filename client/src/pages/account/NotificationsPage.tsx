import { useEffect, useState, useCallback } from 'react'
import { Bell, Trash2, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationService } from '../../services/notification.service'
import { formatRelative } from '../../utils'

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  ORDER: 'bg-brand-100 text-brand-700',
  PAYMENT: 'bg-emerald-100 text-emerald-700',
  SHIPMENT: 'bg-sky-100 text-sky-700',
  REFUND: 'bg-violet-100 text-violet-700',
  CANCELLATION: 'bg-red-100 text-red-700',
  REPAIR: 'bg-amber-100 text-amber-700',
  SELL: 'bg-teal-100 text-teal-700',
  EXCHANGE: 'bg-indigo-100 text-indigo-700',
  ACCOUNT: 'bg-gray-100 text-gray-700',
  ANNOUNCEMENT: 'bg-fuchsia-100 text-fuchsia-700',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    notificationService.getNotifications({ limit: '50' })
      .then(r => setNotifications(r?.data || []))
      .catch(() => toast.error('Could not load notifications'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const markRead = async (id: string) => {
    await notificationService.markAsRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => ((n._id || n.id) === id ? { ...n, isRead: true } : n)))
  }

  const markAllRead = async () => {
    await notificationService.markAllRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    toast.success('All notifications marked as read')
  }

  const remove = async (id: string) => {
    await notificationService.deleteNotification(id).catch(() => {})
    setNotifications(prev => prev.filter(n => (n._id || n.id) !== id))
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button onClick={markAllRead} className="btn-ghost !px-3 !py-1.5 !text-sm"><CheckCheck className="mr-1 h-4 w-4" /> Mark all read</button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Bell className="h-10 w-10 mb-2" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const id = n._id || n.id
            return (
              <div key={id} onClick={() => markRead(id)}
                className={`card flex cursor-pointer items-start gap-3 p-4 transition-colors ${!n.isRead ? 'border-brand-200 bg-brand-50/40' : ''}`}>
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-gray-200' : 'bg-brand-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    {n.type && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${NOTIFICATION_TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'}`}>{n.type}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatRelative(n.createdAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(id) }} className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500" aria-label="Delete notification">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}