'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  assignment: '📚',
  quiz_passed: '📝',
  certificate: '🏅',
  announcement: '📢',
  overdue: '⚠️',
  video_created: '🎬',
  user_created: '👤',
}

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? '🔔'
}

function isToday(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

function isYesterday(d: Date) {
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  return d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate()
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function groupNotifications(notifications: Notification[]) {
  const today: Notification[] = []
  const yesterday: Notification[] = []
  const earlier: Notification[] = []

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    if (isToday(d)) today.push(n)
    else if (isYesterday(d)) yesterday.push(n)
    else earlier.push(n)
  }

  return { today, yesterday, earlier }
}

function NotificationRow({
  n,
  onClick,
}: {
  n: Notification
  onClick: (n: Notification) => void
}) {
  return (
    <div
      onClick={() => onClick(n)}
      className={[
        'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer',
        n.link ? 'hover:bg-[#1e3a6e]/20' : '',
        !n.read ? 'bg-[#003CA6]/10' : '',
      ].join(' ')}
    >
      <span className="text-2xl flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${n.read ? 'text-gray-300' : 'text-white'}`}>
            {n.title}
          </p>
          {!n.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#00A3E0]" />
          )}
        </div>
        {n.body && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <p className="text-xs text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
    </div>
  )
}

function Section({ label, items, onClickRow }: {
  label: string
  items: Notification[]
  onClickRow: (n: Notification) => void
}) {
  if (!items.length) return null
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-4 pb-2 pt-1">
        {label}
      </h2>
      <div className="divide-y divide-[#1e3a6e]/40">
        {items.map(n => (
          <NotificationRow key={n.id} n={n} onClick={onClickRow} />
        ))}
      </div>
    </div>
  )
}

export default function NotificationsList({ initial }: { initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    await fetch('/api/lms/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
    )
  }, [])

  const handleClick = useCallback(async (n: Notification) => {
    if (!n.read) await markRead([n.id])
    if (n.link) router.push(n.link)
  }, [markRead, router])

  const markAllRead = useCallback(async () => {
    setLoading(true)
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    await markRead(unreadIds)
    setLoading(false)
  }, [notifications, markRead])

  const { today, yesterday, earlier } = groupNotifications(notifications)
  const hasUnread = notifications.some(n => !n.read)

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-5xl mb-4">🔔</span>
        <p className="text-gray-400 text-lg">No notifications yet</p>
        <p className="text-gray-600 text-sm mt-1">We'll let you know when something happens.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a6e]">
        <h1 className="text-lg font-semibold text-white">Notifications</h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            disabled={loading}
            className="text-xs text-[#00A3E0] hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Groups */}
      <div className="pt-2">
        <Section label="Today" items={today} onClickRow={handleClick} />
        <Section label="Yesterday" items={yesterday} onClickRow={handleClick} />
        <Section label="Earlier" items={earlier} onClickRow={handleClick} />
      </div>
    </div>
  )
}
