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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarView({ assignments }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Stable initial values — updated after mount to avoid hydration mismatch
  const [viewYear, setViewYear] = useState(2025)
  const [viewMonth, setViewMonth] = useState(0)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Set real current month/year only on client
  useEffect(() => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }, [])

  const assignmentsByDay = useMemo(() => {
    const map: Record<number, Assignment[]> = {}
    assignments.forEach((a) => {
      const d = new Date(a.dueDate)
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate()
        if (!map[day]) map[day] = []
        map[day].push(a)
      }
    })
    return map
  }, [assignments, viewYear, viewMonth])

  const selectedAssignments = selectedDay ? (assignmentsByDay[selectedDay] ?? []) : []

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const todayDate = mounted ? new Date() : null

  const isToday = (day: number) =>
    mounted && todayDate !== null &&
    day === todayDate.getDate() && viewMonth === todayDate.getMonth() && viewYear === todayDate.getFullYear()

  const isPastDue = (day: number) => {
    if (!mounted || !todayDate) return false
    const cellDate = new Date(viewYear, viewMonth, day)
    return cellDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Calendar */}
      <div style={{ flex: 1, background: '#0f2540', border: '1px solid #1e3a6e', borderRadius: 12, padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <button
            onClick={prevMonth}
            style={{ background: '#1e3a6e', border: 'none', color: '#e2e8f0', padding: '0.4rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '1rem' }}
          >
            ‹
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#ffffff' }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            style={{ background: '#1e3a6e', border: 'none', color: '#e2e8f0', padding: '0.4rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '1rem' }}
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', padding: '0.25rem 0', fontWeight: 600, letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const dayAssignments = assignmentsByDay[day] ?? []
            const overdue = isPastDue(day) && dayAssignments.length > 0
            const todayCell = isToday(day)
            const selected = selectedDay === day

            let bg = 'transparent'
            if (selected) bg = '#003CA6'
            else if (todayCell) bg = '#1e3a6e'

            let border = '1px solid transparent'
            if (todayCell && !selected) border = '1px solid #00A3E0'

            const maxVisible = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 3
            const visible = dayAssignments.slice(0, maxVisible)
            const overflow = dayAssignments.length - maxVisible

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(selected ? null : day)}
                style={{
                  background: bg,
                  border,
                  borderRadius: 8,
                  padding: '0.25rem 0.2rem',
                  minHeight: 56,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = '#152b4a' }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = bg }}
              >
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: todayCell ? 700 : 500,
                  color: todayCell ? '#00A3E0' : '#cbd5e1',
                  marginBottom: 4,
                }}>
                  {day}
                </div>
                {visible.map((a) => (
                  <div
                    key={a.id}
                    title={`${a.courseEmoji} ${a.courseTitle} — ${a.userDisplayName}`}
                    style={{
                      fontSize: '0.6rem',
                      background: overdue ? '#7f1d1d' : '#003CA6',
                      color: overdue ? '#fca5a5' : '#bfdbfe',
                      borderRadius: 4,
                      padding: '1px 4px',
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {a.courseEmoji} {a.courseTitle}
                  </div>
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>+{overflow} more</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Side panel */}
      {selectedDay !== null && (
        <div className="w-full lg:w-72 flex-shrink-0" style={{
          background: '#0f2540',
          border: '1px solid #1e3a6e',
          borderRadius: 12,
          padding: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: '#ffffff', fontSize: '1rem' }}>
              {MONTHS[viewMonth]} {selectedDay}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>

          {selectedAssignments.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No assignments due this day.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedAssignments.map((a) => {
                const due = new Date(a.dueDate)
                const pastDue = due < today
                return (
                  <div
                    key={a.id}
                    style={{
                      background: pastDue ? '#450a0a' : '#0d2d52',
                      border: `1px solid ${pastDue ? '#7f1d1d' : '#1e3a6e'}`,
                      borderRadius: 8,
                      padding: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: 4 }}>
                      {a.courseEmoji} <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>{a.courseTitle}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.userDisplayName}</div>
                    {a.userEmail && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.userEmail}</div>}
                    {pastDue && (
                      <div style={{ fontSize: '0.68rem', color: '#f87171', marginTop: 4, fontWeight: 600 }}>⚠ Overdue</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
