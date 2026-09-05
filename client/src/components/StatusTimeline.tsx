import { CheckCircle2, Circle } from 'lucide-react'

interface TimelineEntry {
  status: string
  changedAt?: Date | string
  createdAt?: Date | string
  changedBy?: string
  note?: string | null
}

interface StatusTimelineProps {
  history?: TimelineEntry[]
  labels?: Record<string, string>
  colors?: Record<string, string>
}

export default function StatusTimeline({ history, labels, colors }: StatusTimelineProps) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-gray-400">No status history yet.</p>
  }

  const sorted = [...history].sort((a, b) => new Date(b.changedAt || b.createdAt || 0).getTime() - new Date(a.changedAt || a.createdAt || 0).getTime())

  return (
    <ol className="relative space-y-4 border-l-2 border-gray-100 pl-4">
      {sorted.map((entry, idx) => {
        const label = labels?.[entry.status] || entry.status
        return (
          <li key={idx} className="relative">
            <span className={`absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full ${idx === 0 ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {idx === 0 ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <div className="text-sm">
              <span className={`badge ${colors?.[entry.status] || 'badge-info'}`}>{label}</span>
              {entry.changedBy && <span className="ml-2 text-xs text-gray-400">by {entry.changedBy}</span>}
              <p className="mt-1 text-xs text-gray-400">
                {new Date(entry.changedAt || entry.createdAt || '').toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              {entry.note && <p className="mt-1 text-xs text-gray-500">{entry.note}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}