'use client'

import { useState } from 'react'
import { X, Search, Check, Loader2, ChevronLeft, ChevronRight, Users, BookOpen, Calendar, ClipboardList } from 'lucide-react'

interface Course {
  id: string
  title: string
  emoji: string
  published: boolean
}

interface User {
  id: string
  email: string
  name: string
  imageUrl: string
  role: string
  enrollments: number
  certificates: number
  createdAt: string
}

interface Props {
  courses: Course[]
  users: User[]
  onClose: () => void
  onSuccess: (assigned: number, enrolled: number) => void
}

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

const STEPS = ['Select Users', 'Select Courses', 'Due Date', 'Review']

export default function BulkAssignModal({ courses, users, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ assigned: number; enrolled: number } | null>(null)
  const [error, setError] = useState('')

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  )

  function toggleUser(id: string) {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleCourse(id: string) {
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAllUsers() {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id))
    }
  }

  function toggleAllCourses() {
    if (selectedCourseIds.length === filteredCourses.length) {
      setSelectedCourseIds([])
    } else {
      setSelectedCourseIds(filteredCourses.map(c => c.id))
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/lms/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          courseIds: selectedCourseIds,
          ...(dueDate ? { dueDate } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign')
      setResult(data)
      onSuccess(data.assigned, data.enrolled)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canNext =
    (step === 0 && selectedUserIds.length > 0) ||
    (step === 1 && selectedCourseIds.length > 0) ||
    step === 2

  const selectedUsers = users.filter(u => selectedUserIds.includes(u.id))
  const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id))

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-xl flex flex-col max-h-[90vh]" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: ap.border }}>
          <div>
            <h2 className="text-white font-semibold text-lg">Bulk Assign Courses</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: ap.border }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors"
                style={{
                  background: i < step ? '#059669' : i === step ? ap.blue : '#1e293b',
                  color: i <= step ? '#fff' : '#475569',
                }}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs hidden sm:block truncate" style={{ color: i === step ? '#e2e8f0' : '#475569' }}>{s}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px mx-1" style={{ background: '#1e3a6e' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {result ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h3 className="text-white font-semibold text-lg">Assignment Complete</h3>
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
                <p className="text-sm" style={{ color: '#6ee7b7' }}>
                  <span className="font-bold text-white">{result.assigned}</span> new assignment{result.assigned !== 1 ? 's' : ''} created
                </p>
                <p className="text-sm" style={{ color: '#6ee7b7' }}>
                  <span className="font-bold text-white">{result.enrolled}</span> new enrollment{result.enrolled !== 1 ? 's' : ''} added
                </p>
              </div>
              <p className="text-xs" style={{ color: '#475569' }}>Duplicates were skipped automatically.</p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: ap.blue }}
              >
                Done
              </button>
            </div>
          ) : step === 0 ? (
            /* Step 1: Select Users */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: ap.cyan }} />
                  <span className="text-sm font-semibold text-white">Select Users</span>
                </div>
                <button
                  onClick={toggleAllUsers}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: ap.cyan, border: `1px solid ${ap.border}`, background: '#091525' }}
                >
                  {selectedUserIds.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-white text-sm rounded-lg focus:outline-none"
                  style={{ background: ap.bg, border: `1px solid ${ap.border}` }}
                />
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-xs" style={{ color: ap.cyan }}>{selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected</p>
              )}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredUsers.map(user => {
                  const selected = selectedUserIds.includes(user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{
                        background: selected ? 'rgba(0,60,166,0.25)' : '#091525',
                        border: `1px solid ${selected ? ap.blue : ap.border}`,
                      }}
                    >
                      <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs truncate" style={{ color: '#475569' }}>{user.email} · {user.role}</p>
                      </div>
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: selected ? ap.blue : '#1e293b', border: `1px solid ${selected ? ap.blue : ap.border}` }}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-center py-6 text-sm" style={{ color: '#334155' }}>No users found</p>
                )}
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 2: Select Courses */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: ap.cyan }} />
                  <span className="text-sm font-semibold text-white">Select Courses</span>
                </div>
                <button
                  onClick={toggleAllCourses}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: ap.cyan, border: `1px solid ${ap.border}`, background: '#091525' }}
                >
                  {selectedCourseIds.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                <input
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full pl-9 pr-3 py-2 text-white text-sm rounded-lg focus:outline-none"
                  style={{ background: ap.bg, border: `1px solid ${ap.border}` }}
                />
              </div>
              {selectedCourseIds.length > 0 && (
                <p className="text-xs" style={{ color: ap.cyan }}>{selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? 's' : ''} selected</p>
              )}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {filteredCourses.map(course => {
                  const selected = selectedCourseIds.includes(course.id)
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{
                        background: selected ? 'rgba(0,60,166,0.25)' : '#091525',
                        border: `1px solid ${selected ? ap.blue : ap.border}`,
                      }}
                    >
                      <span className="text-xl leading-none flex-shrink-0">{course.emoji}</span>
                      <span className="flex-1 text-sm truncate" style={{ color: selected ? '#fff' : '#94a3b8' }}>{course.title}</span>
                      {!course.published && (
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#1e293b', color: '#475569' }}>draft</span>
                      )}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ background: selected ? ap.blue : '#1e293b', border: `1px solid ${selected ? ap.blue : ap.border}` }}
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
                {filteredCourses.length === 0 && (
                  <p className="text-center py-6 text-sm" style={{ color: '#334155' }}>No courses found</p>
                )}
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 3: Due Date */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: ap.cyan }} />
                <span className="text-sm font-semibold text-white">Set Due Date (Optional)</span>
              </div>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Set a deadline for when learners should complete the assigned courses.
              </p>
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}`, colorScheme: 'dark' }}
                />
              </div>
              {dueDate && (
                <p className="text-xs" style={{ color: ap.cyan }}>
                  Due: {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
              {!dueDate && (
                <p className="text-xs" style={{ color: '#334155' }}>Leave blank for no due date</p>
              )}
            </div>
          ) : (
            /* Step 4: Review */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" style={{ color: ap.cyan }} />
                <span className="text-sm font-semibold text-white">Review Assignment</span>
              </div>

              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(0,60,166,0.15)', border: `1px solid ${ap.blue}` }}>
                <p className="text-white font-semibold text-lg">
                  Assigning {selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? 's' : ''} to {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  {selectedUserIds.length * selectedCourseIds.length} total assignment{selectedUserIds.length * selectedCourseIds.length !== 1 ? 's' : ''} (duplicates skipped)
                </p>
                {dueDate && (
                  <p className="text-xs mt-2" style={{ color: ap.cyan }}>
                    Due by {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#475569' }}>Users ({selectedUsers.length})</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 text-xs">
                        <img src={u.imageUrl} alt="" className="w-5 h-5 rounded-full bg-gray-700 flex-shrink-0" />
                        <span className="text-gray-300 truncate">{u.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#475569' }}>Courses ({selectedCourses.length})</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedCourses.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-xs">
                        <span>{c.emoji}</span>
                        <span className="text-gray-300 truncate">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: ap.border }}>
            <button
              onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
              style={{ background: '#1e293b' }}
            >
              {step === 0 ? 'Cancel' : <><ChevronLeft className="w-4 h-4" /> Back</>}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: ap.blue }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: ap.blue }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Assigning...</> : <>Assign Courses</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
