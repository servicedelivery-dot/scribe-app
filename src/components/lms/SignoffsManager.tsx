'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Plus, X, Loader2, ClipboardCheck } from 'lucide-react'

interface Signoff {
  id: string
  courseId: string
  userId: string
  requestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  requestedAt: string
  courseTitle: string
  courseEmoji: string
  userDisplayName: string
  userEmail: string
}

interface Course {
  id: string
  title: string
  emoji: string
}

interface User {
  id: string
  name: string
  email: string
}

type Tab = 'all' | 'pending' | 'approved' | 'rejected'

export default function SignoffsManager({
  initialSignoffs,
  courses,
}: {
  initialSignoffs: Signoff[]
  courses: Course[]
}) {
  const [signoffs, setSignoffs] = useState(initialSignoffs)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null)

  // New request form state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  const counts = {
    all: signoffs.length,
    pending: signoffs.filter(s => s.status === 'pending').length,
    approved: signoffs.filter(s => s.status === 'approved').length,
    rejected: signoffs.filter(s => s.status === 'rejected').length,
  }

  const filtered = activeTab === 'all' ? signoffs : signoffs.filter(s => s.status === activeTab)

  async function openModal() {
    setShowModal(true)
    if (users.length === 0) {
      setUsersLoading(true)
      const res = await fetch('/api/lms/users')
      const data = await res.json()
      setUsers(data)
      setUsersLoading(false)
    }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setFormSaving(true)
    const res = await fetch('/api/lms/signoffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: formCourseId, userId: formUserId, notes: formNotes || undefined }),
    })
    if (res.ok) {
      const newSignoff = await res.json()
      const user = users.find(u => u.id === formUserId)
      const course = courses.find(c => c.id === formCourseId)
      setSignoffs(prev => [{
        ...newSignoff,
        courseTitle: course?.title ?? 'Unknown',
        courseEmoji: course?.emoji ?? '📚',
        userDisplayName: user?.name ?? formUserId,
        userEmail: user?.email ?? '',
      }, ...prev])
      setFormUserId(''); setFormCourseId(''); setFormNotes('')
      setShowModal(false)
    }
    setFormSaving(false)
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id)
    const res = await fetch(`/api/lms/signoffs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSignoffs(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    }
    setActionLoading(null)
    setConfirmId(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" style={{ color: '#00A3E0' }} />
            Sign-off Requests
          </h1>
          <p className="text-gray-400 mt-1">Manage compliance sign-off requests for courses</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#003CA6' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#00A3E0')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#003CA6')}
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: '#1e3a6e' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? 'text-white border-b-2'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            style={activeTab === tab.key ? { borderColor: '#00A3E0', color: '#00A3E0' } : {}}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.key ? 'text-white' : 'bg-gray-700 text-gray-400'
            }`} style={activeTab === tab.key ? { backgroundColor: '#003CA6' } : {}}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No sign-off requests{activeTab !== 'all' ? ` with status "${activeTab}"` : ''}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="rounded-xl overflow-hidden border mx-4 sm:mx-0" style={{ borderColor: '#1e3a6e' }}>
          <table className="w-full min-w-[650px] text-sm">
            <thead>
              <tr style={{ backgroundColor: '#0a1628', borderBottom: '1px solid #1e3a6e' }}>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Course</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Requested</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Notes</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#0d1b2e' : '#0a1628',
                    borderBottom: '1px solid #1e3a6e',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{s.userDisplayName}</div>
                    {s.userEmail && <div className="text-gray-500 text-xs">{s.userEmail}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-200">
                    <span className="mr-1">{s.courseEmoji}</span>{s.courseTitle}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(s.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs">
                    <span className="truncate block">{s.notes ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmId({ id: s.id, action: 'approved' })}
                          disabled={actionLoading === s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setConfirmId({ id: s.id, action: 'rejected' })}
                          disabled={actionLoading === s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                    {s.status !== 'pending' && (
                      <span className="text-gray-600 text-xs">
                        {s.reviewedAt ? new Date(s.reviewedAt).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-sm mx-4 sm:mx-0 border" style={{ backgroundColor: '#0d1b2e', borderColor: '#1e3a6e' }}>
            <h2 className="text-white font-semibold mb-2">
              {confirmId.action === 'approved' ? 'Approve' : 'Reject'} Sign-off?
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Are you sure you want to {confirmId.action === 'approved' ? 'approve' : 'reject'} this sign-off request?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateStatus(confirmId.id, confirmId.action)}
                disabled={actionLoading === confirmId.id}
                className="flex-1 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: confirmId.action === 'approved' ? '#15803d' : '#b91c1c' }}
              >
                {actionLoading === confirmId.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmId.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md mx-4 sm:mx-0 border overflow-y-auto max-h-[90vh]" style={{ backgroundColor: '#0d1b2e', borderColor: '#1e3a6e' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">New Sign-off Request</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <form onSubmit={submitRequest} className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-medium">User</label>
                  <select
                    value={formUserId}
                    onChange={e => setFormUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none border"
                    style={{ backgroundColor: '#0a1628', borderColor: '#1e3a6e' }}
                  >
                    <option value="">Select a user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-medium">Course</label>
                  <select
                    value={formCourseId}
                    onChange={e => setFormCourseId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none border"
                    style={{ backgroundColor: '#0a1628', borderColor: '#1e3a6e' }}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-medium">Notes (optional)</label>
                  <textarea
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none border placeholder-gray-600 resize-none"
                    style={{ backgroundColor: '#0a1628', borderColor: '#1e3a6e' }}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="flex-1 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#003CA6' }}
                  >
                    {formSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const config = {
    pending: { label: 'Pending', bg: 'rgba(161,98,7,0.2)', color: '#fbbf24', border: 'rgba(161,98,7,0.4)' },
    approved: { label: 'Approved', bg: 'rgba(22,101,52,0.2)', color: '#4ade80', border: 'rgba(22,101,52,0.4)' },
    rejected: { label: 'Rejected', bg: 'rgba(153,27,27,0.2)', color: '#f87171', border: 'rgba(153,27,27,0.4)' },
  }[status]

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}
    >
      {config.label}
    </span>
  )
}
