'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Metric {
  userId: string
  name: string
  email: string
  watchedSeconds: number
  totalSeconds: number
  lastPosition: number
  pct: number
  completed: boolean
  lastSeen: string
}

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function VideoMetricsPanel({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/lms/video-progress/metrics?lessonId=${lessonId}`)
      .then(r => r.json())
      .then(data => { setMetrics(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open, lessonId])

  const completed = metrics.filter(m => m.completed).length
  const started   = metrics.filter(m => m.pct > 0).length
  const avgPct    = metrics.length > 0 ? Math.round(metrics.reduce((a, m) => a + m.pct, 0) / metrics.length) : 0

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${ap.border}` }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:opacity-80"
        style={{ background: '#091525' }}
      >
        <div className="flex items-center gap-2" style={{ color: ap.cyan }}>
          <Play className="w-4 h-4" />
          <span className="font-semibold">Video Watch Metrics</span>
          {metrics.length > 0 && !loading && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: ap.blue, color: '#fff' }}>
              {metrics.length} viewers
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div style={{ background: ap.bg }}>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading metrics...
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: '#334155' }}>
              No one has watched this video yet.
            </div>
          ) : (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-px" style={{ borderBottom: `1px solid ${ap.border}`, background: ap.border }}>
                {[
                  { icon: <Users className="w-4 h-4" />, label: 'Started', val: `${started}/${metrics.length}` },
                  { icon: <CheckCircle className="w-4 h-4" />, label: 'Completed', val: completed, color: completed > 0 ? '#10b981' : undefined },
                  { icon: <Play className="w-4 h-4" />, label: 'Avg watched', val: `${avgPct}%` },
                ].map(({ icon, label, val, color }) => (
                  <div key={label} className="px-4 py-3 text-center" style={{ background: ap.bg }}>
                    <div className="flex items-center justify-center gap-1 mb-1" style={{ color: color ?? '#475569' }}>{icon}</div>
                    <div className="text-lg font-bold text-white">{val}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Per-user rows */}
              <div className="divide-y" style={{ borderColor: `${ap.border}40` }}>
                {metrics.map(m => (
                  <div key={m.userId} className="px-4 py-3 flex items-center gap-4">
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      <p className="text-xs truncate" style={{ color: '#475569' }}>{m.email}</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-32 flex-shrink-0">
                      <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#64748b' }}>
                        <span>{m.pct}%</span>
                        <span>{fmt(m.lastPosition)} / {fmt(m.totalSeconds)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                        <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.completed ? '#10b981' : ap.blue }} />
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full"
                      style={m.completed
                        ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                        : m.pct > 0
                          ? { background: 'rgba(0,60,166,0.2)', color: ap.cyan }
                          : { background: '#1e293b', color: '#475569' }}>
                      {m.completed ? '✅ Done' : m.pct > 0 ? '▶ In progress' : '⏸ Not started'}
                    </div>

                    {/* Last seen */}
                    <div className="flex-shrink-0 text-xs" style={{ color: '#334155' }}>
                      {timeAgo(m.lastSeen)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
