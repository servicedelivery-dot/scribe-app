'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Check, Search, Loader2, Calendar, Users } from 'lucide-react'

const EMOJIS = ['📚', '🎓', '💡', '🚀', '⚡', '🌟', '🔧', '📊', '🎯', '🧠']

interface User {
  id: string
  email: string
  name: string
  imageUrl: string
  role: string
}

export default function NewCourseButton() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'create' | 'assign'>('create')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [loading, setLoading] = useState(false)
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)

  const router = useRouter()

  useEffect(() => {
    if (step === 'assign') {
      setLoadingUsers(true)
      fetch('/api/lms/users')
        .then(r => r.json())
        .then((data: User[]) => setUsers(data))
        .finally(() => setLoadingUsers(false))
    }
  }, [step])

  function reset() {
    setOpen(false)
    setStep('create')
    setTitle('')
    setDescription('')
    setEmoji('📚')
    setCreatedCourseId(null)
    setUsers([])
    setUserSearch('')
    setSelectedUserIds([])
    setDueDate('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/lms/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, emoji }),
    })
    const course = await res.json()
    setLoading(false)
    if (course.id) {
      setCreatedCourseId(course.id)
      setStep('assign')
    }
  }

  function goToEditor() {
    if (!createdCourseId) return
    router.push(`/lms/manage/${createdCourseId}`)
    router.refresh()
    reset()
  }

  async function handleAssign() {
    if (!createdCourseId) return
    if (selectedUserIds.length > 0) {
      setAssigning(true)
      await fetch('/api/lms/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUserIds,
          courseIds: [createdCourseId],
          ...(dueDate ? { dueDate } : {}),
        }),
      })
      setAssigning(false)
    }
    goToEditor()
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  function toggleUser(id: string) {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll() {
    setSelectedUserIds(prev =>
      prev.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id)
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> New Course
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {step === 'create' ? 'New Course' : 'Assign to Users'}
                </h2>
                {step === 'assign' && (
                  <p className="text-xs text-gray-500 mt-0.5">Step 2 of 2 — optional</p>
                )}
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {step === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Emoji</label>
                    <div className="flex gap-2 flex-wrap">
                      {EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => setEmoji(e)}
                          className={`text-2xl p-1.5 rounded-lg transition-colors ${emoji === e ? 'bg-violet-600' : 'hover:bg-gray-800'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Course title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500 resize-none"
                  />
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={reset}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !title.trim()}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {loading ? 'Creating...' : 'Create →'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Assign this course to users now and optionally set a completion deadline. You can also do this later from the Users page.
                  </p>

                  {/* Deadline */}
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Deadline <span className="normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
                      style={{ colorScheme: 'dark' }}
                    />
                    {dueDate && (
                      <p className="text-xs text-violet-400 mt-1">
                        Due: {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {/* User picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Users
                        {selectedUserIds.length > 0 && (
                          <span className="text-violet-400 normal-case font-normal ml-1">
                            {selectedUserIds.length} selected
                          </span>
                        )}
                      </label>
                      {filteredUsers.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleAll}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          {selectedUserIds.length === filteredUsers.length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                    </div>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-8 pr-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-500 text-sm"
                      />
                    </div>
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {filteredUsers.map(user => {
                          const selected = selectedUserIds.includes(user.id)
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleUser(user.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                              style={{
                                background: selected ? 'rgba(124,58,237,0.2)' : '#1f2937',
                                border: `1px solid ${selected ? '#7c3aed' : '#374151'}`,
                              }}
                            >
                              <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full bg-gray-700 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                                style={{ background: selected ? '#7c3aed' : '#374151' }}
                              >
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </button>
                          )
                        })}
                        {filteredUsers.length === 0 && (
                          <p className="text-center py-4 text-sm text-gray-500">No users found</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={goToEditor}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={assigning}
                      className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {assigning
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
                        : selectedUserIds.length > 0 ? 'Assign & Open' : 'Open Course'
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
