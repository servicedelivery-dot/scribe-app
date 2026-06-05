'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, UserPlus, Mail, X, Loader2, ChevronDown, Eye, EyeOff, Check, BookOpen, Copy, KeyRound, Trash2, AlertTriangle } from 'lucide-react'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

interface User {
  id: string
  email: string
  name: string
  imageUrl: string
  role: Role
  enrollments: number
  certificates: number
  createdAt: string
}

interface Course {
  id: string
  title: string
  emoji: string
  published: boolean
}

const ROLE_STYLES: Record<Role, string> = {
  owner: 'bg-purple-900/40 text-purple-300 border border-purple-800',
  admin: 'bg-red-900/40 text-red-300 border border-red-800',
  manager: 'bg-blue-900/40 text-blue-300 border border-blue-800',
  learner: 'bg-gray-800 text-gray-400 border border-gray-700',
}

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

export default function UserManagement({ initialUsers, currentRole }: { initialUsers: User[]; currentRole?: 'owner' | 'admin' }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string | null>>({})
  const [loadingPasswordId, setLoadingPasswordId] = useState<string | null>(null)
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const router = useRouter()

  // Create user form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'learner' as Role, department: '', jobTitle: '', phone: '', notes: '',
    courseIds: [] as string[],
  })
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('learner')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [inviteCredentials, setInviteCredentials] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/lms/courses')
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setCourses(data) : setCourses([]))
      .catch(() => setCourses([]))
  }, [])

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function updateRole(userId: string, role: Role) {
    setUpdatingId(userId)
    await fetch('/api/lms/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, role }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setUpdatingId(null)
  }

  async function revealPassword(userId: string) {
    if (revealedPasswords[userId] !== undefined) {
      setRevealedPasswords(prev => { const n = { ...prev }; delete n[userId]; return n })
      return
    }
    setLoadingPasswordId(userId)
    const res = await fetch(`/api/lms/users/temp-password?userId=${userId}`)
    const data = await res.json()
    setLoadingPasswordId(null)
    setRevealedPasswords(prev => ({ ...prev, [userId]: data.tempPassword ?? null }))
  }

  async function copyPassword(userId: string, password: string) {
    await navigator.clipboard.writeText(password)
    setCopiedPasswordId(userId)
    setTimeout(() => setCopiedPasswordId(null), 2000)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    setDeleteError('')
    const res = await fetch(`/api/lms/users/${deleteConfirm.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (data.error) {
      setDeleteError(data.error)
    } else {
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      router.refresh()
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateMsg(null)
    const res = await fetch('/api/lms/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (data.error) {
      setCreateMsg({ type: 'err', text: data.error })
    } else {
      setCreateMsg({ type: 'ok', text: `✓ ${data.name} created. They can now log in at /sign-in with their email and password.` })
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'learner', department: '', jobTitle: '', phone: '', notes: '', courseIds: [] })
      router.refresh()
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    setInviteCredentials(null)
    const res = await fetch('/api/lms/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)
    if (data.error) {
      setInviteMsg({ type: 'err', text: data.error })
    } else {
      setInviteCredentials({ email: data.email, tempPassword: data.tempPassword })
      setInviteEmail('')
      setInviteRole('learner')
      router.refresh()
    }
  }

  function copyCredentials(email: string, password: string) {
    navigator.clipboard.writeText(`Login URL: ${window.location.origin}/sign-in\nEmail: ${email}\nPassword: ${password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleCourse(courseId: string) {
    setForm(f => ({
      ...f,
      courseIds: f.courseIds.includes(courseId)
        ? f.courseIds.filter(id => id !== courseId)
        : [...f.courseIds, courseId],
    }))
  }

  const field = (label: string, key: keyof Omit<typeof form, 'courseIds'>, opts?: { type?: string; required?: boolean; placeholder?: string; rows?: number }) => (
    <div>
      <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
        {label}{opts?.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {opts?.rows ? (
        <textarea
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={opts.rows}
          placeholder={opts.placeholder}
          className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none"
          style={{ background: '#091525', border: `1px solid ${ap.border}` }}
        />
      ) : (
        <input
          type={opts?.type || 'text'}
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          required={opts?.required}
          placeholder={opts?.placeholder}
          className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
          style={{ background: '#091525', border: `1px solid ${ap.border}` }}
        />
      )}
    </div>
  )

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: ap.cyan }} /> User Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
            {users.length} users · create accounts or invite users to set up their own
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => { setShowInvite(true); setInviteMsg(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#1e293b', color: ap.cyan, border: `1px solid ${ap.border}` }}
          >
            <Mail className="w-4 h-4" /> Invite User
          </button>
          <button
            onClick={() => {
              const uuid = crypto.randomUUID().replace(/-/g, '')
              const hex = uuid.slice(0, 10).toUpperCase()
              const suffix = ['!', '@', '#', '$', '%'][parseInt(uuid[10], 16) % 5]
              const mid = uuid.slice(11, 15).toLowerCase()
              setForm(f => ({ ...f, password: `${hex}${suffix}${mid}` }))
              setShowCreate(true)
              setCreateMsg(null)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: ap.blue }}
          >
            <UserPlus className="w-4 h-4" /> Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full pl-9 pr-3 py-2 text-white text-sm rounded-lg focus:outline-none"
            style={{ background: ap.bg, border: `1px solid ${ap.border}` }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'admin', 'manager', 'learner'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{ background: roleFilter === r ? ap.blue : '#1e293b', color: roleFilter === r ? '#fff' : '#64748b' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="rounded-xl overflow-hidden mx-4 sm:mx-0" style={{ border: `1px solid ${ap.border}` }}>
        <table className="w-full min-w-[700px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${ap.border}`, background: '#091525' }}>
              {['User', 'Role', 'Enrolled', 'Certs', 'Joined', 'Temp Password', ...(currentRole === 'owner' ? [''] : [])].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} style={{ borderBottom: `1px solid rgba(30,58,110,0.4)`, background: ap.bg }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className="text-xs" style={{ color: '#475569' }}>{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative inline-flex items-center">
                    <select
                      value={user.role}
                      onChange={e => updateRole(user.id, e.target.value as Role)}
                      disabled={updatingId === user.id}
                      className={`appearance-none pr-6 pl-2 py-1 rounded-full text-xs font-semibold cursor-pointer focus:outline-none ${ROLE_STYLES[user.role]} bg-transparent`}
                    >
                      {(['learner', 'manager', 'admin', 'owner'] as Role[]).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    {updatingId === user.id
                      ? <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin" />
                      : <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center text-gray-300">{user.enrollments}</td>
                <td className="px-4 py-3 text-sm text-center" style={{ color: user.certificates > 0 ? '#fbbf24' : '#334155' }}>
                  {user.certificates > 0 ? `🏅 ${user.certificates}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: '#475569' }}>
                  {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {revealedPasswords[user.id] !== undefined ? (
                    revealedPasswords[user.id] ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: '#091525', color: ap.cyan, border: `1px solid ${ap.border}` }}>
                          {revealedPasswords[user.id]}
                        </span>
                        <button
                          onClick={() => copyPassword(user.id, revealedPasswords[user.id]!)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          title="Copy password"
                        >
                          {copiedPasswordId === user.id
                            ? <Check className="w-3.5 h-3.5" style={{ color: '#86efac' }} />
                            : <Copy className="w-3.5 h-3.5" style={{ color: '#475569' }} />}
                        </button>
                        <button
                          onClick={() => revealPassword(user.id)}
                          className="p-1 rounded hover:bg-white/5 transition-colors"
                          title="Hide"
                        >
                          <EyeOff className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#334155' }}>—</span>
                    )
                  ) : (
                    <button
                      onClick={() => revealPassword(user.id)}
                      disabled={loadingPasswordId === user.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
                      style={{ background: '#091525', color: '#475569', border: `1px solid ${ap.border}` }}
                    >
                      {loadingPasswordId === user.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <KeyRound className="w-3 h-3" />}
                      Show
                    </button>
                  )}
                </td>
                {currentRole === 'owner' && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setDeleteConfirm(user); setDeleteError('') }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-900/30 group"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10" style={{ color: '#334155' }}>No users found</div>}
      </div>
      </div>

      {/* Invite User modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-md mx-4 sm:mx-auto overflow-y-auto max-h-[90vh]" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: ap.border }}>
              <div>
                <h2 className="text-white font-semibold text-lg">Invite User</h2>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>They'll receive an email to set up their own password</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  placeholder="john@company.com"
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                >
                  <option value="learner">Learner</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(0,163,224,0.07)', border: `1px solid rgba(0,163,224,0.2)`, color: '#64748b' }}>
                <span style={{ color: ap.cyan }}>How it works:</span> Creates the account instantly with a temporary password. Share the credentials with the user — they can log in immediately and change their password from their profile.
              </div>

              {inviteMsg && (
                <div className="rounded-xl p-3 text-sm flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: '#fca5a5' }}>
                  {inviteMsg.text}
                </div>
              )}

              {inviteCredentials && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#86efac' }}>
                    <Check className="w-4 h-4" /> Account created — share these credentials
                  </div>
                  <div className="rounded-lg p-3 text-sm font-mono space-y-1" style={{ background: '#040d1a', color: '#e2e8f0' }}>
                    <div><span style={{ color: '#475569' }}>Login: </span>{window.location.origin}/sign-in</div>
                    <div><span style={{ color: '#475569' }}>Email: </span>{inviteCredentials.email}</div>
                    <div><span style={{ color: '#475569' }}>Password: </span><span style={{ color: ap.cyan }}>{inviteCredentials.tempPassword}</span></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCredentials(inviteCredentials.email, inviteCredentials.tempPassword)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: copied ? 'rgba(16,185,129,0.2)' : '#1e293b', color: copied ? '#86efac' : '#94a3b8' }}>
                    {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy credentials</>}
                  </button>
                  <p className="text-xs" style={{ color: '#475569' }}>Share via WhatsApp, email, or however you prefer. The user can change their password after logging in.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowInvite(false); setInviteCredentials(null); setInviteMsg(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: '#1e293b' }}>
                  Close
                </button>
                {!inviteCredentials && (
                  <button type="submit" disabled={inviting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: ap.blue }}>
                    {inviting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><UserPlus className="w-4 h-4" />Create & Get Credentials</>}
                  </button>
                )}
                {inviteCredentials && (
                  <button type="button" onClick={() => { setInviteCredentials(null); setInviteMsg(null) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
                    style={{ background: ap.blue }}>
                    <UserPlus className="w-4 h-4" /> Invite Another
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="rounded-2xl w-full max-w-lg mx-4 sm:mx-auto my-4 overflow-y-auto max-h-[90vh]" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: ap.border }}>
              <h2 className="text-white font-semibold text-lg">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                {field('First Name', 'firstName', { required: true, placeholder: 'John' })}
                {field('Last Name', 'lastName', { placeholder: 'Smith' })}
              </div>

              {field('Email Address', 'email', { type: 'email', required: true, placeholder: 'john@company.com' })}

              {/* Password — auto-generated, editable */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase tracking-wide" style={{ color: '#64748b' }}>
                    Password <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const uuid = crypto.randomUUID().replace(/-/g, '')
                      const hex = uuid.slice(0, 10).toUpperCase()
                      const suffix = ['!', '@', '#', '$', '%'][parseInt(uuid[10], 16) % 5]
                      const mid = uuid.slice(11, 15).toLowerCase()
                      setForm(f => ({ ...f, password: `${hex}${suffix}${mid}` }))
                    }}
                    className="text-xs flex items-center gap-1 transition-colors hover:opacity-80"
                    style={{ color: ap.cyan }}
                  >
                    <KeyRound className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    className="w-full px-3 py-2 pr-10 text-sm text-white font-mono rounded-lg focus:outline-none"
                    style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: '#334155' }}>Auto-generated · stored in DB · user logs in at /sign-in</p>
              </div>

              {/* Role */}
              <div>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: '#091525', border: `1px solid ${ap.border}` }}
                >
                  <option value="learner">Learner</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {/* Course Assignment */}
              <div className="pt-2 border-t" style={{ borderColor: ap.border }}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4" style={{ color: ap.cyan }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ap.cyan }}>Assign Courses</p>
                  {form.courseIds.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: ap.blue, color: '#fff' }}>
                      {form.courseIds.length}
                    </span>
                  )}
                </div>
                {courses.length === 0 ? (
                  <p className="text-xs" style={{ color: '#334155' }}>No published courses available.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {courses.map(course => {
                      const selected = form.courseIds.includes(course.id)
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                          style={{
                            background: selected ? 'rgba(0,60,166,0.25)' : '#091525',
                            border: `1px solid ${selected ? ap.blue : ap.border}`,
                            color: selected ? '#fff' : '#94a3b8',
                          }}
                        >
                          <span className="text-base leading-none">{course.emoji}</span>
                          <span className="flex-1 truncate">{course.title}</span>
                          {!course.published && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1e293b', color: '#475569' }}>draft</span>}
                          {selected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: ap.cyan }} />}
                        </button>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: '#334155' }}>Selected courses will be assigned and the user auto-enrolled on creation.</p>
              </div>

              {/* Profile info */}
              <div className="pt-2 border-t" style={{ borderColor: ap.border }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: ap.cyan }}>Profile Info (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  {field('Department', 'department', { placeholder: 'Operations' })}
                  {field('Job Title', 'jobTitle', { placeholder: 'Ground Agent' })}
                </div>
                {field('Phone', 'phone', { type: 'tel', placeholder: '+44 7700 900000' })}
                {field('Notes', 'notes', { rows: 2, placeholder: 'Any notes about this user...' })}
              </div>

              {createMsg && (
                <div className="rounded-xl p-3 text-sm flex items-start gap-2"
                  style={{ background: createMsg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${createMsg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: createMsg.type === 'ok' ? '#86efac' : '#fca5a5' }}>
                  {createMsg.type === 'ok' ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" /> : null}
                  {createMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                  style={{ background: '#1e293b' }}>
                  Close
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: ap.blue }}>
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><UserPlus className="w-4 h-4" />Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete confirmation modal — owner only */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-sm" style={{ background: '#080f1e', border: '1px solid #7f1d1d' }}>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Delete User</h2>
                  <p className="text-xs" style={{ color: '#64748b' }}>This action cannot be undone</p>
                </div>
              </div>

              <div className="rounded-xl p-3 mb-4" style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
                <div className="flex items-center gap-3">
                  <img src={deleteConfirm.imageUrl} alt="" className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{deleteConfirm.name}</p>
                    <p className="text-xs" style={{ color: '#475569' }}>{deleteConfirm.email}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                This will permanently delete the account from Clerk and remove all their enrollments, progress, quiz attempts, and certificates from the database.
              </p>

              {deleteError && (
                <div className="rounded-lg p-3 mb-4 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setDeleteConfirm(null); setDeleteError('') }} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  style={{ background: '#1e293b' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  style={{ background: '#dc2626' }}>
                  {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4" />Delete User</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
