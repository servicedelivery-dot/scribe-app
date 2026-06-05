'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Globe, Lock, Loader2, X, Check, GripVertical } from 'lucide-react'

interface Course {
  id: string
  title: string
  emoji: string
  published: boolean
}

interface LearningPath {
  id: string
  title: string
  description: string | null
  emoji: string
  published: boolean
  createdAt: string
  courses: Course[]
}

interface Props {
  initialPaths: LearningPath[]
  allCourses: Course[]
  canEdit: boolean
}

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

const EMOJIS = ['🛤️', '🚀', '⭐', '🎯', '📚', '🏆', '💡', '🔥', '🌟', '🧠']

export default function LearningPathsManager({ initialPaths, allCourses, canEdit }: Props) {
  const [paths, setPaths] = useState(initialPaths)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', emoji: '🛤️', courseIds: [] as string[] })
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  function toggleCourse(courseId: string) {
    setForm(f => ({
      ...f,
      courseIds: f.courseIds.includes(courseId)
        ? f.courseIds.filter(id => id !== courseId)
        : [...f.courseIds, courseId],
    }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/lms/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      router.refresh()
      setShowCreate(false)
      setForm({ title: '', description: '', emoji: '🛤️', courseIds: [] })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/lms/paths/${id}`, { method: 'DELETE' })
    setPaths(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  async function togglePublish(path: LearningPath) {
    setTogglingId(path.id)
    const res = await fetch(`/api/lms/paths/${path.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !path.published }),
    })
    const updated = await res.json()
    setPaths(prev => prev.map(p => p.id === path.id ? { ...p, published: updated.published } : p))
    setTogglingId(null)
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Paths</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Group courses into structured learning journeys
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: ap.blue }}
          >
            <Plus className="w-4 h-4" /> New Path
          </button>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-lg" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: ap.border }}>
              <h2 className="text-white font-semibold">New Learning Path</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Emoji picker */}
              <div>
                <label className="text-xs uppercase tracking-wide block mb-2" style={{ color: '#64748b' }}>Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button
                      key={e} type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className="w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors"
                      style={{ background: form.emoji === e ? ap.blue : '#1e293b', border: `1px solid ${form.emoji === e ? ap.blue : ap.border}` }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                  placeholder="e.g. New Starter Induction"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                  placeholder="What will learners achieve?"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide block mb-2" style={{ color: '#64748b' }}>
                  Courses ({form.courseIds.length} selected)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {allCourses.map(c => {
                    const sel = form.courseIds.includes(c.id)
                    return (
                      <button
                        key={c.id} type="button"
                        onClick={() => toggleCourse(c.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                        style={{ background: sel ? 'rgba(0,60,166,0.2)' : '#091525', border: `1px solid ${sel ? ap.blue : ap.border}` }}
                      >
                        <span>{c.emoji}</span>
                        <span className="flex-1 text-sm truncate" style={{ color: sel ? '#fff' : '#94a3b8' }}>{c.title}</span>
                        {sel && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ap.cyan }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
              {error && <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: '#1e293b' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !form.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: ap.blue }}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Path
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Path list */}
      {paths.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🛤️</div>
          <p className="text-lg text-white font-medium">No learning paths yet</p>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            {canEdit ? 'Create a path to group courses into a structured journey.' : 'No paths have been published yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.map(path => (
            <div key={path.id} className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
              {/* Path header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <span className="text-2xl flex-shrink-0">{path.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">{path.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${path.published ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {path.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {path.description && (
                    <p className="text-sm mt-0.5 truncate" style={{ color: '#64748b' }}>{path.description}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: '#334155' }}>
                    {path.courses.length} course{path.courses.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => togglePublish(path)}
                        disabled={togglingId === path.id}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        title={path.published ? 'Unpublish' : 'Publish'}
                        style={{ color: path.published ? '#6ee7b7' : '#475569' }}
                      >
                        {togglingId === path.id ? <Loader2 className="w-4 h-4 animate-spin" /> : path.published ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(path.id)}
                        disabled={deletingId === path.id}
                        className="p-2 rounded-lg transition-colors hover:bg-red-900/20"
                        style={{ color: '#475569' }}
                      >
                        {deletingId === path.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === path.id ? null : path.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: '#475569' }}
                  >
                    {expandedId === path.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded courses */}
              {expandedId === path.id && path.courses.length > 0 && (
                <div className="border-t px-5 py-3 space-y-2" style={{ borderColor: ap.border }}>
                  {path.courses.map((c, i) => c && (
                    <div key={c.id} className="flex items-center gap-3 py-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
                        style={{ background: ap.blue, color: '#fff' }}>
                        {i + 1}
                      </div>
                      <span className="text-base flex-shrink-0">{c.emoji}</span>
                      <span className="text-sm text-white truncate">{c.title}</span>
                      {!c.published && (
                        <span className="text-xs px-1.5 py-0.5 rounded ml-auto flex-shrink-0" style={{ background: '#1e293b', color: '#475569' }}>draft</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {expandedId === path.id && path.courses.length === 0 && (
                <div className="border-t px-5 py-4 text-center" style={{ borderColor: ap.border }}>
                  <BookOpen className="w-5 h-5 mx-auto mb-1" style={{ color: '#334155' }} />
                  <p className="text-sm" style={{ color: '#334155' }}>No courses in this path yet</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
