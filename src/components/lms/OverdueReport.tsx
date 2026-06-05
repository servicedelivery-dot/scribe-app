'use client'

import { useState, useMemo, useEffect } from 'react'

interface Assignment {
  id: string
  userId: string
  userDisplayName: string
  userEmail: string
  courseId: string
  courseTitle: string
  courseEmoji: string
  dueDate: string
  assignedAt: string
}

interface Props {
  assignments: Assignment[]
}

function daysOverdue(dueDate: string, now: Date): number {
  const due = new Date(dueDate)
  const diff = now.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function OverdueReport({ assignments }: Props) {
  const [search, setSearch] = useState('')
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return assignments
    return assignments.filter(
      (a) =>
        a.userDisplayName.toLowerCase().includes(q) ||
        a.courseTitle.toLowerCase().includes(q) ||
        a.userEmail.toLowerCase().includes(q)
    )
  }, [assignments, search])

  function exportCSV() {
    const headers = ['User', 'Email', 'Course', 'Due Date', 'Days Overdue']
    const rows = filtered.map((a) => [
      a.userDisplayName,
      a.userEmail,
      `${a.courseEmoji} ${a.courseTitle}`,
      formatDate(a.dueDate),
      String(now ? daysOverdue(a.dueDate, now) : 0),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `overdue-assignments-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (assignments.length === 0) {
    return (
      <div style={{
        background: '#0f2540',
        border: '1px solid #1e3a6e',
        borderRadius: 12,
        padding: '3rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.25rem', margin: 0 }}>
          All assignments are on track
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>No overdue assignments found.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5" style={{ marginBottom: '1.25rem' }}>
        {/* Count badge */}
        <div style={{
          background: '#7f1d1d',
          border: '1px solid #991b1b',
          borderRadius: 999,
          padding: '0.3rem 0.9rem',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#fca5a5',
          flexShrink: 0,
        }}>
          {assignments.length} overdue assignment{assignments.length !== 1 ? 's' : ''}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by user or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            background: '#0f2540',
            border: '1px solid #1e3a6e',
            borderRadius: 8,
            padding: '0.5rem 0.75rem',
            color: '#e2e8f0',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />

        {/* Export */}
        <button
          onClick={exportCSV}
          style={{
            background: '#003CA6',
            border: '1px solid #1e3a6e',
            borderRadius: 8,
            padding: '0.5rem 1rem',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-0">
      <div style={{ background: '#0f2540', border: '1px solid #1e3a6e', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d2d52', borderBottom: '1px solid #1e3a6e' }}>
              {['User', 'Course', 'Due Date', 'Days Overdue', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No results match your search.
                </td>
              </tr>
            ) : (
              filtered.map((a, idx) => {
                const days = now ? daysOverdue(a.dueDate, now) : 0
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid #1a3050' : 'none',
                      background: idx % 2 === 0 ? 'transparent' : '#0a1f38',
                    }}
                  >
                    {/* User */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                        {a.userDisplayName}
                      </div>
                      {a.userEmail && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{a.userEmail}</div>
                      )}
                    </td>

                    {/* Course */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                        {a.courseEmoji} {a.courseTitle}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#f87171' }}>
                      {formatDate(a.dueDate)}
                    </td>

                    {/* Days Overdue */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        background: days >= 30 ? '#450a0a' : '#7f1d1d',
                        color: '#fca5a5',
                        borderRadius: 999,
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        {days}d
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        background: '#450a0a',
                        border: '1px solid #7f1d1d',
                        color: '#f87171',
                        borderRadius: 6,
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        Overdue
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
