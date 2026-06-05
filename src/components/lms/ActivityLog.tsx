'use client'

import { useState, useCallback, useEffect } from 'react'

type ActivityEntry = {
  id: string
  userId: string
  actorName: string
  action: string
  entityType: string | null
  entityId: string | null
  entityName: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

const ACTION_FILTERS = [
  { value: 'all', label: 'All Activity' },
  { value: 'enrolled', label: 'Enrollments' },
  { value: 'lesson_completed', label: 'Lessons' },
  { value: 'quiz_passed', label: 'Quizzes' },
  { value: 'certificate_earned', label: 'Certificates' },
]

const ACTION_ICONS: Record<string, string> = {
  enrolled: '📚',
  lesson_completed: '✅',
  quiz_passed: '📝',
  certificate_earned: '🏅',
  user_created: '👤',
  video_created: '🎬',
}

const ACTION_LABELS: Record<string, string> = {
  enrolled: 'enrolled in',
  lesson_completed: 'completed lesson',
  quiz_passed: 'passed quiz for',
  certificate_earned: 'earned certificate for',
  user_created: 'joined as a new user',
}

function timeAgo(isoDate: string, now: number): string {
  const seconds = Math.floor((now - new Date(isoDate).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function ActivityLog({ initialEntries }: { initialEntries: ActivityEntry[] }) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [hasMore, setHasMore] = useState(initialEntries.length === 50)
  const [offset, setOffset] = useState(50)
  const [nowTs, setNowTs] = useState(0)
  useEffect(() => { setNowTs(Date.now()) }, [])

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.action === filter)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lms/activity')
      const data = await res.json()
      if (data.entries) {
        setEntries(data.entries.map((e: ActivityEntry & { createdAt: string | Date }) => ({
          ...e,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
        })))
        setOffset(50)
        setHasMore(data.entries.length === 50)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ offset: String(offset) })
      if (filter !== 'all') params.set('action', filter)
      const res = await fetch(`/api/lms/activity?${params}`)
      const data = await res.json()
      if (data.entries) {
        const newEntries = data.entries.map((e: ActivityEntry & { createdAt: string | Date }) => ({
          ...e,
          createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date(e.createdAt).toISOString(),
        }))
        setEntries((prev) => [...prev, ...newEntries])
        setOffset((prev) => prev + newEntries.length)
        setHasMore(newEntries.length === 50)
      }
    } finally {
      setLoading(false)
    }
  }, [offset, filter])

  const seed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/lms/activity/seed', { method: 'POST' })
      const data = await res.json()
      if (data.inserted > 0) {
        await refresh()
      } else {
        alert(data.message ?? 'No data to seed.')
      }
    } finally {
      setSeeding(false)
    }
  }, [refresh])

  return (
    <div className="p-4 sm:p-6 min-h-screen" style={{ background: '#0d1b2e' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Track all learner activity across your LMS
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: '#003CA6', color: '#fff' }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap mb-6">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={
              filter === f.value
                ? { background: '#00A3E0', color: '#fff' }
                : { background: '#1e3a6e', color: '#94a3b8', border: '1px solid #1e3a6e' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline feed */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-16 text-center"
          style={{ border: '1px solid #1e3a6e', background: '#0f2341' }}
        >
          <div className="text-5xl mb-4">📋</div>
          <p className="text-white text-lg font-semibold mb-2">No activity yet</p>
          <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
            Activity will appear here as learners enroll, complete lessons, and earn certificates.
          </p>
          <button
            onClick={seed}
            disabled={seeding}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: '#003CA6', color: '#fff' }}
          >
            {seeding ? 'Seeding...' : '⚡ Backfill from existing data'}
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #1e3a6e', background: '#0f2341' }}
        >
          <div className="divide-y" style={{ borderColor: '#1e3a6e' }}>
            {filtered.map((entry) => {
              const icon = ACTION_ICONS[entry.action] ?? '📌'
              const verb = ACTION_LABELS[entry.action] ?? entry.action
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                  {/* Icon bubble */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg"
                    style={{ background: '#1e3a6e' }}
                  >
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{entry.actorName}</span>{' '}
                      <span style={{ color: '#94a3b8' }}>{verb}</span>{' '}
                      {entry.entityName && (
                        <span className="font-medium" style={{ color: '#00A3E0' }}>
                          {entry.entityName}
                        </span>
                      )}
                    </p>
                    {entry.action === 'quiz_passed' && entry.meta?.score != null && (
                      <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                        Score: {Math.round(entry.meta.score as number)}%
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="flex-shrink-0 text-xs" style={{ color: '#64748b' }}>
                    {nowTs ? timeAgo(entry.createdAt, nowTs) : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="px-5 py-4 text-center" style={{ borderTop: '1px solid #1e3a6e' }}>
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: '#1e3a6e', color: '#94a3b8' }}
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Seed button when there is content (for admins) */}
      {filtered.length > 0 && entries.length < 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={seed}
            disabled={seeding}
            className="text-xs underline disabled:opacity-50"
            style={{ color: '#64748b' }}
          >
            {seeding ? 'Seeding...' : 'Backfill from existing data'}
          </button>
        </div>
      )}
    </div>
  )
}
