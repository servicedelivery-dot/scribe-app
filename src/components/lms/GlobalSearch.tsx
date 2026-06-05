'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, FileText, Users, Megaphone, Loader2 } from 'lucide-react'

interface CourseResult {
  id: string
  title: string
  emoji: string
  type: 'course'
}

interface LessonResult {
  id: string
  courseId: string
  title: string
  type: 'lesson'
}

interface UserResult {
  userId: string
  displayName: string | null
  email: string | null
  role: string
  type: 'user'
}

interface AnnouncementResult {
  id: string
  title: string
  type: 'announcement'
}

interface SearchResults {
  courses: CourseResult[]
  lessons: LessonResult[]
  users: UserResult[]
  announcements: AnnouncementResult[]
}

export default function GlobalSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/lms/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data: SearchResults = await res.json()
        setResults(data)
        setOpen(true)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(val), 300)
  }

  const navigate = (path: string) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(path)
  }

  const hasResults =
    results &&
    (results.courses.length > 0 ||
      results.lessons.length > 0 ||
      results.users.length > 0 ||
      results.announcements.length > 0)

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#0d1b2e',
          border: '1px solid #1e3a6e',
          borderRadius: '8px',
          padding: '0 12px',
          height: '36px',
        }}
      >
        <Search size={15} style={{ color: '#00A3E0', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim() && results) setOpen(true) }}
          placeholder="Search courses, lessons, users… (⌘K)"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e2e8f0',
            fontSize: '13px',
          }}
        />
        {loading && <Loader2 size={14} style={{ color: '#00A3E0', animation: 'spin 1s linear infinite' }} />}
        {!loading && query && (
          <span style={{ fontSize: '11px', color: '#64748b', userSelect: 'none' }}>ESC</span>
        )}
      </div>

      {/* Dropdown */}
      {open && query.trim() && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#080f1e',
            border: '1px solid #1e3a6e',
            borderRadius: '10px',
            zIndex: 9999,
            maxHeight: '420px',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Searching…
            </div>
          )}

          {!loading && !hasResults && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && hasResults && (
            <div style={{ padding: '6px' }}>
              {/* Courses */}
              {results!.courses.length > 0 && (
                <Section label="Courses" icon={<BookOpen size={12} />}>
                  {results!.courses.map((c) => (
                    <ResultRow
                      key={c.id}
                      icon={<span style={{ fontSize: '14px' }}>{c.emoji}</span>}
                      label={c.title}
                      onClick={() => navigate(`/lms/course/${c.id}`)}
                    />
                  ))}
                </Section>
              )}

              {/* Lessons */}
              {results!.lessons.length > 0 && (
                <Section label="Lessons" icon={<FileText size={12} />}>
                  {results!.lessons.map((l) => (
                    <ResultRow
                      key={l.id}
                      icon={<FileText size={13} style={{ color: '#00A3E0' }} />}
                      label={l.title}
                      onClick={() => navigate(`/lms/manage/${l.courseId}`)}
                    />
                  ))}
                </Section>
              )}

              {/* Users */}
              {results!.users.length > 0 && (
                <Section label="Users" icon={<Users size={12} />}>
                  {results!.users.map((u) => (
                    <ResultRow
                      key={u.userId}
                      icon={<Users size={13} style={{ color: '#00A3E0' }} />}
                      label={u.displayName ?? u.email ?? u.userId}
                      sublabel={u.email ?? undefined}
                      onClick={() => navigate('/lms/users')}
                    />
                  ))}
                </Section>
              )}

              {/* Announcements */}
              {results!.announcements.length > 0 && (
                <Section label="Announcements" icon={<Megaphone size={12} />}>
                  {results!.announcements.map((a) => (
                    <ResultRow
                      key={a.id}
                      icon={<Megaphone size={13} style={{ color: '#00A3E0' }} />}
                      label={a.title}
                      onClick={() => navigate('/lms/announcements')}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Section({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px 4px',
          color: '#64748b',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '7px 10px',
        borderRadius: '6px',
        background: hovered ? '#0d1b2e' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            color: '#e2e8f0',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            style={{
              display: 'block',
              color: '#64748b',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
    </button>
  )
}
