'use client'

import { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, ChevronRight, Download, Bell, Loader2, Check } from 'lucide-react'

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

interface CourseStat {
  courseId: string; title: string; emoji: string
  pct: number; done: number; total: number
  dueDate: string | null; certified: boolean
}

interface TeamMember {
  userId: string; name: string; email: string; role: string
  enrolled: number; lessonsCompleted: number; certificates: number
  lastActive: string | null; courses: CourseStat[]
}

function pctColor(p: number) {
  if (p >= 70) return '#10b981'
  if (p >= 30) return '#f59e0b'
  return '#ef4444'
}

export default function TeamDashboard({ members, courses }: { members: TeamMember[]; courses: { id: string; title: string; emoji: string }[] }) {
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudged, setNudged] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let m = members
    if (search) m = m.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    if (courseFilter) m = m.filter(u => u.courses.some(c => c.courseId === courseFilter))
    return m
  }, [members, search, courseFilter])

  async function nudge(userId: string) {
    setNudging(userId)
    try {
      await fetch('/api/lms/users/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      })
      setNudged(prev => new Set([...prev, userId]))
    } finally {
      setNudging(null)
    }
  }

  function exportCSV() {
    const rows = [['Name', 'Email', 'Role', 'Enrolled', 'Lessons Done', 'Certificates', 'Last Active']]
    filtered.forEach(m => rows.push([m.name, m.email, m.role, String(m.enrolled), String(m.lessonsCompleted), String(m.certificates), m.lastActive ? new Date(m.lastActive).toLocaleDateString() : '—']))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'team-progress.csv'; a.click()
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">👥 Team Progress</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#1e293b', border: `1px solid ${ap.border}` }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm text-white rounded-lg focus:outline-none"
            style={{ background: ap.bg, border: `1px solid ${ap.border}` }} />
        </div>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
          className="px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
          style={{ background: ap.bg, border: `1px solid ${ap.border}` }}>
          <option value="">All courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ap.border}` }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ background: '#091525', borderBottom: `1px solid ${ap.border}` }}>
                {['Member', 'Role', 'Enrolled', 'Lessons', 'Certs', 'Last Active', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-sm" style={{ color: '#334155' }}>No team members found</td></tr>
              ) : filtered.map(m => (
                <Fragment key={m.userId}>
                  <tr style={{ borderBottom: `1px solid rgba(30,58,110,0.4)`, background: ap.bg }}
                    className="hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setExpanded(expanded === m.userId ? null : m.userId)}>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{m.name}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>{m.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs capitalize px-2 py-0.5 rounded-full" style={{ background: '#1e293b', color: '#94a3b8' }}>{m.role}</span></td>
                    <td className="px-4 py-3 text-sm text-white text-center">{m.enrolled}</td>
                    <td className="px-4 py-3 text-sm text-white text-center">{m.lessonsCompleted}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: m.certificates > 0 ? '#fbbf24' : '#334155' }}>{m.certificates > 0 ? `🏅 ${m.certificates}` : '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>{m.lastActive ? new Date(m.lastActive).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td className="px-4 py-3">{expanded === m.userId ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}</td>
                  </tr>
                  {expanded === m.userId && m.courses.length > 0 && (
                    <tr style={{ background: '#080f1e', borderBottom: `1px solid ${ap.border}` }}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>Course Progress</p>
                          {/* Nudge button — send a reminder notification */}
                          {m.courses.some(c => !c.certified) && (
                            <button
                              onClick={() => nudge(m.userId)}
                              disabled={nudging === m.userId || nudged.has(m.userId)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                              style={{
                                background: nudged.has(m.userId) ? 'rgba(16,185,129,0.15)' : 'rgba(0,163,224,0.15)',
                                color: nudged.has(m.userId) ? '#10b981' : ap.cyan,
                                border: `1px solid ${nudged.has(m.userId) ? '#10b98140' : '#00A3E040'}`,
                              }}
                            >
                              {nudging === m.userId
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : nudged.has(m.userId)
                                ? <><Check className="w-3 h-3" /> Reminder sent</>
                                : <><Bell className="w-3 h-3" /> Nudge</>}
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {m.courses.map(c => (
                            <div key={c.courseId} className="flex items-center gap-3">
                              <span className="text-lg flex-shrink-0">{c.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-white truncate">{c.title}</span>
                                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: pctColor(c.pct) }}>{c.pct}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: pctColor(c.pct) }} />
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                                  {c.done}/{c.total} lessons
                                  {c.certified && ' · 🏅 Certified'}
                                  {c.dueDate && ` · Due ${new Date(c.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
