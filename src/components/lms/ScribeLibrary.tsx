'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Check, X, Loader2, Eye, ChevronDown, Library, Search, Plus, Layers } from 'lucide-react'

interface ScribeItem {
  id: string
  title: string
  slidesUrl: string
  movieUrl: string
  scrollUrl: string
  orderIndex: number
}

interface Course {
  id: string
  title: string
  emoji: string
}

type ViewMode = 'slides' | 'movie' | 'scroll'

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

export default function ScribeLibrary({ initialItems, courses }: { initialItems: ScribeItem[]; courses: Course[] }) {
  const [items, setItems] = useState(initialItems)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<{ item: ScribeItem; mode: ViewMode } | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [targetCourse, setTargetCourse] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignResult, setAssignResult] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [seeding, setSeeding] = useState(false)
  const router = useRouter()

  // Auto-seed on first visit if empty
  useEffect(() => {
    if (items.length === 0 && !seeding) {
      seed()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))

  function toggle(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  async function seed() {
    setSeeding(true)
    const res = await fetch('/api/lms/scribe-library/seed', { method: 'POST' })
    const data = await res.json()
    setSeeding(false)
    if (data.seeded) {
      const refreshed = await fetch('/api/lms/scribe-library').then(r => r.json())
      setItems(refreshed)
    }
    router.refresh()
  }

  async function assign() {
    if (!targetCourse) return
    setAssigning(true)
    setAssignResult(null)
    const res = await fetch('/api/lms/scribe-library/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scribeIds: [...selected], courseId: targetCourse }),
    })
    const data = await res.json()
    setAssigning(false)
    if (data.error) {
      setAssignResult({ type: 'err', text: data.error })
    } else {
      setAssignResult({ type: 'ok', text: `✓ ${data.added} lesson${data.added !== 1 ? 's' : ''} added to "${data.courseName}" under "Scribe Guides" module.` })
      setSelected(new Set())
      setTimeout(() => { setShowAssign(false); setAssignResult(null) }, 2500)
    }
  }

  const VIEW_LABELS: Record<ViewMode, string> = { slides: '🖼 Slides', movie: '▶ Movie', scroll: '📜 Scroll' }

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Library className="w-6 h-6" style={{ color: ap.cyan }} /> Scribe Library
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
            {items.length} guides · select one or many → assign to a course as lessons
          </p>
        </div>
        {items.length === 0 && (
          <button onClick={seed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: ap.blue }}>
            {seeding ? <><Loader2 className="w-4 h-4 animate-spin" />Seeding...</> : <><Plus className="w-4 h-4" />Seed Lessons</>}
          </button>
        )}
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search guides..."
            className="w-full pl-9 pr-3 py-2 text-white text-sm rounded-lg focus:outline-none"
            style={{ background: ap.bg, border: `1px solid ${ap.border}` }} />
        </div>
        {filtered.length > 0 && (
          <button onClick={toggleAll}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: selected.size === filtered.length ? ap.blue : '#1e293b', color: '#fff' }}>
            {selected.size === filtered.length ? 'Deselect all' : `Select all (${filtered.length})`}
          </button>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 rounded-2xl" style={{ border: `1px dashed ${ap.border}` }}>
          <Library className="w-12 h-12 mx-auto mb-4" style={{ color: '#334155' }} />
          <p className="text-white font-semibold mb-2">No Scribe guides yet</p>
          <p className="text-sm mb-6" style={{ color: '#475569' }}>Click "Seed Lessons" to load all 24 Airportr guides</p>
          <button onClick={seed} disabled={seeding}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: ap.blue }}>
            {seeding ? 'Seeding...' : 'Seed 24 Lessons'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, idx) => {
            const isSelected = selected.has(item.id)
            return (
              <div key={item.id}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  background: isSelected ? 'rgba(0,60,166,0.2)' : '#091525',
                  border: `1.5px solid ${isSelected ? ap.blue : ap.border}`,
                }}
                onClick={() => toggle(item.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{ background: isSelected ? ap.blue : 'transparent', border: `2px solid ${isSelected ? ap.blue : '#334155'}` }}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono" style={{ color: '#334155' }}>#{idx + 1}</span>
                      <span className="text-sm font-medium text-white leading-snug">{item.title}</span>
                    </div>

                    {/* View buttons */}
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      {(['slides', 'movie', 'scroll'] as ViewMode[]).map(mode => (
                        <button key={mode}
                          onClick={() => setPreview({ item, mode })}
                          className="px-2 py-1 rounded text-xs transition-colors"
                          style={{ background: '#0d1b2e', color: ap.cyan, border: `1px solid ${ap.border}` }}>
                          {VIEW_LABELS[mode]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating action bar when items selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: '#0d1b2e', border: `1px solid ${ap.border}` }}>
          <Layers className="w-5 h-5" style={{ color: ap.cyan }} />
          <span className="text-white text-sm font-semibold">{selected.size} guide{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:text-white p-1 rounded"><X className="w-4 h-4" /></button>
          <button onClick={() => { setShowAssign(true); setAssignResult(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: ap.blue }}>
            <BookOpen className="w-4 h-4" /> Add to Course →
          </button>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: ap.border }}>
              <div>
                <h2 className="text-white font-semibold">{preview.item.title}</h2>
                <div className="flex gap-2 mt-2">
                  {(['slides', 'movie', 'scroll'] as ViewMode[]).map(mode => (
                    <button key={mode}
                      onClick={() => setPreview({ ...preview, mode })}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: preview.mode === mode ? ap.blue : '#1e293b', color: preview.mode === mode ? '#fff' : '#94a3b8' }}>
                      {VIEW_LABELS[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <iframe
                key={preview.mode}
                src={preview.mode === 'slides' ? preview.item.slidesUrl : preview.mode === 'movie' ? preview.item.movieUrl : preview.item.scrollUrl}
                className="w-full h-full rounded-xl"
                style={{ minHeight: '300px', border: 0 }}
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}

      {/* Assign to course modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-md" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: ap.border }}>
              <div>
                <h2 className="text-white font-semibold">Add to Course</h2>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                  Adding {selected.size} guide{selected.size !== 1 ? 's' : ''} as lessons
                </p>
              </div>
              <button onClick={() => setShowAssign(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Selected guide list */}
              <div className="rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto" style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
                {items.filter(i => selected.has(i.id)).map(i => (
                  <div key={i.id} className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: ap.cyan }} />
                    {i.title}
                  </div>
                ))}
              </div>

              {/* Course picker */}
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Target Course</label>
                <select value={targetCourse} onChange={e => setTargetCourse(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
                  <option value="">— pick a course —</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
                </select>
              </div>

              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(0,163,224,0.07)', border: `1px solid rgba(0,163,224,0.2)`, color: '#64748b' }}>
                <span style={{ color: ap.cyan }}>Note:</span> Lessons will be added to a "Scribe Guides" module in the selected course. Existing lessons are not affected.
              </div>

              {assignResult && (
                <div className="rounded-xl p-3 text-sm" style={{
                  background: assignResult.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${assignResult.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: assignResult.type === 'ok' ? '#86efac' : '#fca5a5',
                }}>
                  {assignResult.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssign(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white"
                  style={{ background: '#1e293b' }}>Cancel</button>
                <button onClick={assign} disabled={!targetCourse || assigning}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: ap.blue }}>
                  {assigning ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><BookOpen className="w-4 h-4" />Add to Course</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
