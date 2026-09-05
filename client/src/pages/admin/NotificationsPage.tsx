import { useEffect, useState } from 'react'
import { Megaphone, Plus, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationService } from '../../services/notification.service'
import { formatDate } from '../../utils'

const NOTIFICATION_TYPES = ['ANNOUNCEMENT', 'ORDER', 'PAYMENT', 'SHIPMENT', 'REFUND', 'CANCELLATION', 'REPAIR', 'SELL', 'EXCHANGE', 'SERVICEABILITY', 'ACCOUNT']

export default function AdminNotificationsPage() {
  const [view, setView] = useState<'compose' | 'history'>('compose')
  const [type, setType] = useState('ANNOUNCEMENT')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [userIds, setUserIds] = useState('')
  const [sending, setSending] = useState(false)
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    notificationService.getNotifications({ limit: '10' }).then(r => setRecent(r?.data || [])).catch(() => {})
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required')
      return
    }
    setSending(true)
    try {
      const audience = userIds.trim() ? undefined : 'all'
      const body: any = { type, title: title.trim(), message: message.trim() }
      if (audience) body.audience = audience
      else body.userIds = userIds.split(',').map(s => s.trim()).filter(Boolean)
      const res = await notificationService.createNotification(body)
      if (audience) toast.success(res?.message || `Announcement broadcast`)
      else toast.success('Notification created')
      setTitle(''); setMessage(''); setUserIds('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements & Notifications</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('compose')} className={`btn-secondary !px-3 !py-2 !text-sm ${view === 'compose' ? 'bg-brand-50 text-brand-600' : ''}`}><Plus className="mr-1 h-4 w-4" /> Compose</button>
          <button onClick={() => setView('history')} className={`btn-secondary !px-3 !py-2 !text-sm ${view === 'history' ? 'bg-brand-50 text-brand-600' : ''}`}><BellRing className="mr-1 h-4 w-4" /> History</button>
        </div>
      </div>

      {view === 'compose' ? (
        <div className="mt-6 card max-w-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-brand-500" />
            <p className="text-sm text-gray-500">Broadcast an in-app announcement to every customer, or send to specific user ids.</p>
          </div>
          <div className="grid gap-4 text-sm">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input">
                {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. New arrivals are here" />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="input" placeholder="Message text shown to customers" />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Target recipients <span className="text-xs text-gray-400">(comma-separated user ids, leave empty to broadcast to all)</span></label>
              <input value={userIds} onChange={e => setUserIds(e.target.value)} className="input" placeholder="e.g. 64f1a2b3..., 64f1c4d5..." />
            </div>
            <button onClick={handleSend} disabled={sending} className="btn-primary w-full sm:w-auto">{sending ? 'Sending…' : 'Send Notification'}</button>
          </div>
        </div>
      ) : (
        <div className="mt-6 card p-6">
          <h2 className="font-semibold mb-3">Recent notifications</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications have been sent yet</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-400">
                <tr><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Sent to</th><th className="py-2">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((n: any) => (
                  <tr key={n._id || n.id}>
                    <td className="py-3 pr-4"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{n.type}</span></td>
                    <td className="py-3 pr-4 font-medium text-gray-800">{n.title}</td>
                    <td className="py-3 pr-4 text-gray-500">{String(n.userId).slice(-8)}</td>
                    <td className="py-3 text-gray-500">{formatDate(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}