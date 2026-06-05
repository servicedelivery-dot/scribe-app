'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Palette, Users, Bot, Shield, Save, Loader2, Check } from 'lucide-react'

interface OrgSettings {
  id: string
  orgName: string
  logoUrl: string | null
  primaryColor: string
  allowSelfRegister: boolean
  defaultRole: string
  updatedAt: string
}

interface Props {
  settings: OrgSettings
  stats: { users: number; courses: number; enrollments: number; certificates: number }
  aiKeySet: boolean
  currentRole: 'owner' | 'admin'
}

const ap = { bg: '#0d1b2e', border: '#1e3a6e', blue: '#003CA6', cyan: '#00A3E0' }

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: ap.cyan }}>{icon}</span>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide" style={{ color: '#64748b' }}>{label}</label>
      {children}
    </div>
  )
}

export default function SettingsPanel({ settings: initial, stats, aiKeySet, currentRole }: Props) {
  const [form, setForm] = useState({
    orgName: initial.orgName,
    logoUrl: initial.logoUrl ?? '',
    primaryColor: initial.primaryColor,
    allowSelfRegister: initial.allowSelfRegister,
    defaultRole: initial.defaultRole,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const isOwner = currentRole === 'owner'

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/lms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm text-white rounded-lg focus:outline-none'
  const inputStyle = { background: '#091525', border: `1px solid ${ap.border}` }

  return (
    <div className="p-4 sm:p-8 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6" style={{ color: ap.cyan }} /> Academy Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#64748b' }}>Configure your LMS platform</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: saved ? '#059669' : ap.blue }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Users', value: stats.users },
          { label: 'Courses', value: stats.courses },
          { label: 'Enrollments', value: stats.enrollments },
          { label: 'Certificates', value: stats.certificates },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#080f1e', border: `1px solid ${ap.border}` }}>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: '#64748b' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Branding */}
      <Card title="Branding" icon={<Palette className="w-4 h-4" />}>
        <div className="space-y-4">
          <Field label="Organisation Name">
            <input
              value={form.orgName}
              onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
              className={inputClass} style={inputStyle}
              placeholder="Airportr Academy"
            />
          </Field>
          <Field label="Logo URL">
            <input
              value={form.logoUrl}
              onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
              className={inputClass} style={inputStyle}
              placeholder="https://…/logo.png"
            />
          </Field>
          <Field label="Brand Colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <input
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className={inputClass} style={inputStyle}
                placeholder="#003CA6"
              />
            </div>
          </Field>
        </div>
      </Card>

      {/* User defaults */}
      <Card title="User Defaults" icon={<Users className="w-4 h-4" />}>
        <div className="space-y-4">
          <Field label="Default Role for New Users">
            <select
              value={form.defaultRole}
              onChange={e => setForm(f => ({ ...f, defaultRole: e.target.value }))}
              className={inputClass} style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="learner">Learner</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Self Registration">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, allowSelfRegister: !f.allowSelfRegister }))}
                className="w-10 h-5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
                style={{ background: form.allowSelfRegister ? ap.blue : '#1e293b' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: `translateX(${form.allowSelfRegister ? '22px' : '2px'})` }}
                />
              </div>
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                {form.allowSelfRegister ? 'Anyone can sign up' : 'Admin-only user creation'}
              </span>
            </label>
          </Field>
        </div>
      </Card>

      {/* AI */}
      <Card title="AI Features" icon={<Bot className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: aiKeySet ? 'rgba(5,150,105,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${aiKeySet ? 'rgba(5,150,105,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <span className="text-lg">{aiKeySet ? '✅' : '⚠️'}</span>
            <div>
              <p className="text-sm font-medium" style={{ color: aiKeySet ? '#6ee7b7' : '#fca5a5' }}>
                Gemini API Key — {aiKeySet ? 'configured' : 'not set'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                {aiKeySet
                  ? 'AI quiz generation and lesson creation are available.'
                  : 'Add GEMINI_API_KEY to your .env.local to enable AI features.'}
              </p>
            </div>
          </div>
          <p className="text-xs" style={{ color: '#475569' }}>
            AI features: auto-generate quiz questions from lesson content, create lessons from URLs or topics.
            Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: ap.cyan }}>aistudio.google.com</a>.
          </p>
        </div>
      </Card>

      {/* Integrations */}
      {isOwner && (
        <Card title="Integrations" icon={<Shield className="w-4 h-4" />}>
          <div className="space-y-3 text-sm" style={{ color: '#64748b' }}>
            {[
              { label: 'Clerk Auth', ok: true, note: 'User authentication & sessions' },
              { label: 'Neon PostgreSQL', ok: true, note: 'Course data & progress' },
              { label: 'UploadThing', ok: !!process.env.UPLOADTHING_TOKEN, note: 'File & video uploads' },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#091525', border: `1px solid ${ap.border}` }}>
                <div>
                  <p className="text-white text-sm font-medium">{i.label}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>{i.note}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.ok ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {i.ok ? 'Connected' : 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
