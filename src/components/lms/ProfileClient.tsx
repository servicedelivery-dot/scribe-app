'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Award, CheckCircle, User, Clock, Loader2, Save } from 'lucide-react'

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

interface Props {
  clerkUser: { id: string; email: string; imageUrl: string }
  profile: {
    userId: string; firstName: string | null; lastName: string | null
    department: string | null; jobTitle: string | null; phone: string | null
    notes: string | null; createdAt: string; updatedAt: string
  } | null
  role: string
  stats: { enrolled: number; certificates: number; lessonsCompleted: number }
  assignedCourses: {
    id: string; courseId: string; userId: string; assignedBy: string
    dueDate: string | null; assignedAt: string
    course: { id: string; title: string; emoji: string; published: boolean } | undefined
  }[]
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:   { bg: 'rgba(168,85,247,0.15)',  color: '#d8b4fe' },
  admin:   { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5' },
  manager: { bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd' },
  learner: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}

export default function ProfileClient({ clerkUser, profile, role, stats, assignedCourses }: Props) {
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName:  profile?.lastName  ?? '',
    department: profile?.department ?? '',
    jobTitle:  profile?.jobTitle  ?? '',
    phone:     profile?.phone     ?? '',
    notes:     profile?.notes     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveProfile() {
    setSaving(true)
    await fetch('/api/lms/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const roleStyle = ROLE_STYLE[role] ?? ROLE_STYLE.learner

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <img src={clerkUser.imageUrl} alt="" className="w-16 h-16 rounded-full bg-gray-700 flex-shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-white">
            {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : clerkUser.email}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>{clerkUser.email}</p>
          <span className="inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize"
            style={{ background: roleStyle.bg, color: roleStyle.color }}>
            {role}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: <BookOpen className="w-5 h-5" />, label: 'Enrolled', val: stats.enrolled },
          { icon: <CheckCircle className="w-5 h-5" />, label: 'Lessons done', val: stats.lessonsCompleted },
          { icon: <Award className="w-5 h-5" />, label: 'Certificates', val: stats.certificates, gold: stats.certificates > 0 },
        ].map(({ icon, label, val, gold }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
            <div className="flex justify-center mb-1" style={{ color: gold ? '#fbbf24' : ap.cyan }}>{icon}</div>
            <div className="text-2xl font-bold text-white">{val}</div>
            <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile editor */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: ap.cyan }} /> Profile Info
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'First Name', key: 'firstName' as const },
              { label: 'Last Name',  key: 'lastName'  as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>{label}</label>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                  style={{ background: ap.bg, border: `1px solid ${ap.border}` }} />
              </div>
            ))}
          </div>
          {[
            { label: 'Department', key: 'department' as const, placeholder: 'Operations' },
            { label: 'Job Title',  key: 'jobTitle'   as const, placeholder: 'Ground Agent' },
            { label: 'Phone',      key: 'phone'       as const, placeholder: '+44 7700 900000' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none"
                style={{ background: ap.bg, border: `1px solid ${ap.border}` }} />
            </div>
          ))}
          <div>
            <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: '#64748b' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none resize-none"
              style={{ background: ap.bg, border: `1px solid ${ap.border}` }} />
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: saved ? '#059669' : ap.blue }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              : saved ? <><CheckCircle className="w-4 h-4" />Saved!</>
              : <><Save className="w-4 h-4" />Save Profile</>}
          </button>
        </div>

        {/* Assigned courses */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${ap.border}` }}>
          <div className="px-5 py-4" style={{ background: '#091525' }}>
            <h2 className="text-white font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: ap.cyan }} /> My Courses
              <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: ap.blue, color: '#fff' }}>
                {assignedCourses.length}
              </span>
            </h2>
          </div>

          {assignedCourses.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: '#334155' }}>
              No courses assigned yet.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: `${ap.border}60` }}>
              {assignedCourses.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3" style={{ background: ap.bg }}>
                  <span className="text-xl flex-shrink-0">{a.course?.emoji ?? '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.course?.title ?? 'Unknown Course'}</p>
                    {a.dueDate && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: new Date(a.dueDate) < new Date() ? '#ef4444' : '#475569' }}>
                        <Clock className="w-3 h-3" />
                        Due {new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {new Date(a.dueDate) < new Date() && ' · Overdue'}
                      </p>
                    )}
                  </div>
                  {a.course && (
                    <Link href={`/lms/course/${a.course.id}`}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                      style={{ background: ap.blue }}>
                      Open →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {stats.certificates > 0 && (
            <div className="px-5 py-3 border-t" style={{ borderColor: ap.border, background: '#091525' }}>
              <Link href="/lms/certificates" className="text-sm flex items-center gap-2" style={{ color: '#fbbf24' }}>
                🏅 View my {stats.certificates} certificate{stats.certificates !== 1 ? 's' : ''} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
