'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/lms/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setUnread(data.unread ?? 0)
      }
    } catch {}
  }, [])

  // Initial fetch + poll every 60s
  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [fetchCount])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const openPanel = async () => {
    setOpen(o => !o)
    if (!open) {
      setLoadingList(true)
      try {
        const res = await fetch('/api/lms/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications((data.notifications ?? []).slice(0, 10))
        }
      } catch {}
      setLoadingList(false)
    }
  }

  const handleNotifClick = async (n: Notification) => {
    // Mark as read
    if (!n.read) {
      await fetch('/api/lms/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      })
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => Math.max(0, u - 1))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={openPanel}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e3a6e]/40 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ background: '#080f1e', border: '1px solid #1e3a6e' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a6e]">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unread > 0 && (
              <span className="text-xs text-[#00A3E0]">{unread} unread</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loadingList ? (
              <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">No notifications yet</div>
            ) : (
              <div className="divide-y divide-[#1e3a6e]/40">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={[
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#1e3a6e]/30',
                      !n.read ? 'bg-[#003CA6]/10' : '',
                    ].join(' ')}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-medium truncate ${n.read ? 'text-gray-400' : 'text-white'}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#00A3E0]" />}
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1e3a6e] px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); router.push('/lms/notifications') }}
              className="text-xs text-[#00A3E0] hover:text-white transition-colors w-full text-center"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
