'use client'

import { useState, useEffect } from 'react'
import {
  Layers,
  Plus,
  Trash2,
  X,
  BookOpen,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react'

const COLOR_SWATCHES = [
  { label: 'Blue', value: '#003CA6' },
  { label: 'Cyan', value: '#00A3E0' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Teal', value: '#0d9488' },
]

type Group = {
  id: string
  name: string
  description: string | null
  color: string
  createdBy: string
  createdAt: string
  courseCount: number
}

type Course = {
  id: string
  title: string
  emoji: string
  published: boolean
}

export default function GroupsManager({ initialGroups }: { initialGroups: Group[] }) {
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupCourses, setGroupCourses] = useState<Course[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  // New group form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#003CA6')
  const [creating, setCreating] = useState(false)

  async function openGroup(group: Group) {
    setSelectedGroup(group)
    setLoadingCourses(true)
    try {
      const [gc, ac] = await Promise.all([
        fetch(`/api/lms/groups/${group.id}/courses`).then(r => r.json()),
        fetch('/api/lms/courses').then(r => r.json()),
      ])
      setGroupCourses(gc)
      setAllCourses(ac)
    } finally {
      setLoadingCourses(false)
    }
  }

  async function addCourse(courseId: string) {
    if (!selectedGroup) return
    await fetch(`/api/lms/groups/${selectedGroup.id}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    const updated = await fetch(`/api/lms/groups/${selectedGroup.id}/courses`).then(r => r.json())
    setGroupCourses(updated)
    setGroups(prev => prev.map(g =>
      g.id === selectedGroup.id ? { ...g, courseCount: updated.length } : g
    ))
  }

  async function removeCourse(courseId: string) {
    if (!selectedGroup) return
    await fetch(`/api/lms/groups/${selectedGroup.id}/courses?courseId=${courseId}`, {
      method: 'DELETE',
    })
    const updated = groupCourses.filter(c => c.id !== courseId)
    setGroupCourses(updated)
    setGroups(prev => prev.map(g =>
      g.id === selectedGroup.id ? { ...g, courseCount: updated.length } : g
    ))
  }

  async function createGroup() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/lms/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, color: newColor }),
      })
      const group = await res.json()
      setGroups(prev => [{ ...group, courseCount: 0 }, ...prev])
      setShowNewModal(false)
      setNewName('')
      setNewDesc('')
      setNewColor('#003CA6')
    } finally {
      setCreating(false)
    }
  }

  async function deleteGroup(groupId: string) {
    setDeletingGroupId(groupId)
    try {
      await fetch(`/api/lms/groups/${groupId}`, { method: 'DELETE' })
      setGroups(prev => prev.filter(g => g.id !== groupId))
      if (selectedGroup?.id === groupId) setSelectedGroup(null)
    } finally {
      setDeletingGroupId(null)
    }
  }

  const inGroupIds = new Set(groupCourses.map(c => c.id))
  const availableCourses = allCourses.filter(c => !inGroupIds.has(c.id))

  return (
    <div className="p-8" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6" style={{ color: '#00A3E0' }} />
            Course Groups
          </h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
            Organize courses into groups for easier management
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: '#003CA6' }}
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-24">
          <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e3a6e' }} />
          <p className="text-lg" style={{ color: '#64748b' }}>No groups yet</p>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Create a group to organize your courses</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => (
            <div
              key={group.id}
              className="rounded-xl border p-5 cursor-pointer hover:border-opacity-80 transition-all relative group"
              style={{ background: '#0d1b2e', borderColor: '#1e3a6e' }}
              onClick={() => openGroup(group)}
            >
              {/* Color swatch */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: group.color }} />
                  <span className="font-semibold text-white truncate">{group.name}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteGroup(group.id) }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition-all"
                  disabled={deletingGroupId === group.id}
                >
                  {deletingGroupId === group.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>

              {group.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: '#94a3b8' }}>
                  {group.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: '#1e3a6e', color: '#00A3E0' }}
                >
                  {group.courseCount} {group.courseCount === 1 ? 'course' : 'courses'}
                </span>
                <ChevronRight className="w-4 h-4" style={{ color: '#475569' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Group Modal ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ background: '#0d1b2e', borderColor: '#1e3a6e' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Group</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Name *</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
                  style={{ background: '#0a1628', borderColor: '#1e3a6e' }}
                  placeholder="e.g. Onboarding"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                />
              </div>

              <div>
                <label className="block text-sm mb-1.5" style={{ color: '#94a3b8' }}>Description</label>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors resize-none"
                  style={{ background: '#0a1628', borderColor: '#1e3a6e' }}
                  placeholder="Optional description"
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#94a3b8' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_SWATCHES.map(s => (
                    <button
                      key={s.value}
                      title={s.label}
                      onClick={() => setNewColor(s.value)}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        background: s.value,
                        borderColor: newColor === s.value ? '#ffffff' : 'transparent',
                      }}
                    >
                      {newColor === s.value && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ borderColor: '#1e3a6e', color: '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: '#003CA6' }}
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Detail Slide-over ── */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedGroup(null)}
          />
          <div
            className="relative w-full max-w-lg h-full border-l flex flex-col shadow-2xl overflow-hidden"
            style={{ background: '#0d1b2e', borderColor: '#1e3a6e' }}
          >
            {/* Slide-over header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: '#1e3a6e' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ background: selectedGroup.color }} />
                <div>
                  <h2 className="font-bold text-white">{selectedGroup.name}</h2>
                  {selectedGroup.description && (
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{selectedGroup.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Courses in group */}
              <div>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: '#64748b' }}>
                  Courses in this group ({groupCourses.length})
                </h3>

                {loadingCourses ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00A3E0' }} />
                  </div>
                ) : groupCourses.length === 0 ? (
                  <div
                    className="text-center py-8 rounded-xl border"
                    style={{ borderColor: '#1e3a6e', color: '#475569' }}
                  >
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No courses in this group yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border"
                        style={{ background: '#0a1628', borderColor: '#1e3a6e' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{course.emoji}</span>
                          <span className="text-sm text-white truncate">{course.title}</span>
                          {!course.published && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e3a6e', color: '#64748b' }}>
                              Draft
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeCourse(course.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition-colors"
                          title="Remove from group"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add courses */}
              {!loadingCourses && availableCourses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: '#64748b' }}>
                    Add courses
                  </h3>
                  <div className="space-y-2">
                    {availableCourses.map(course => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border"
                        style={{ background: '#0a1628', borderColor: '#1e3a6e' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xl">{course.emoji}</span>
                          <span className="text-sm text-white truncate">{course.title}</span>
                          {!course.published && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e3a6e', color: '#64748b' }}>
                              Draft
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => addCourse(course.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg text-white transition-colors hover:opacity-80"
                          style={{ background: '#003CA6' }}
                          title="Add to group"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
