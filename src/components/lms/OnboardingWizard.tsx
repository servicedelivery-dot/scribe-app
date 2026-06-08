'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, User, Building2, Briefcase, Truck, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  userName: string
}

const DEPARTMENTS = ['Operations', 'Logistics', 'Dispatch', 'Warehouse', 'Management', 'HR', 'Other']

export default function OnboardingWizard({ userName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    department: '',
    jobTitle: '',
    supplierCompany: '',
    phone: '',
  })

  function f(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  async function finish() {
    setSaving(true)
    try {
      await fetch('/api/lms/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, onboardingComplete: true }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#132035', border: '1px solid #1e3a6e', color: '#e2e8f0', width: '100%',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0a1628', border: '1px solid #1e3a6e' }}>

        {/* Progress bar */}
        <div className="h-1" style={{ background: '#132035' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${(step / 2) * 100}%`, background: '#003CA6' }} />
        </div>

        {/* Step 1 — Welcome + profile */}
        {step === 1 && (
          <div className="p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,60,166,0.2)' }}>
                <GraduationCap className="w-6 h-6" style={{ color: '#00A3E0' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Welcome to Airportr Academy</h2>
                <p className="text-sm" style={{ color: '#4e6680' }}>Let's set up your profile — it takes 30 seconds</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#4e6680' }}>First name</label>
                  <input value={form.firstName} onChange={f('firstName')} placeholder="John"
                    className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: '#4e6680' }}>Last name</label>
                  <input value={form.lastName} onChange={f('lastName')} placeholder="Smith"
                    className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#4e6680' }}>
                  <Truck className="w-3 h-3" /> Supplier / Company
                </label>
                <input value={form.supplierCompany} onChange={f('supplierCompany')} placeholder="e.g. DHL, FedEx, Own Fleet…"
                  className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#4e6680' }}>
                    <Building2 className="w-3 h-3" /> Department
                  </label>
                  <select value={form.department} onChange={f('department')}
                    className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">Select…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#4e6680' }}>
                    <Briefcase className="w-3 h-3" /> Job title
                  </label>
                  <input value={form.jobTitle} onChange={f('jobTitle')} placeholder="Driver, Supervisor…"
                    className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#4e6680' }}>
                  <User className="w-3 h-3" /> Phone (optional)
                </label>
                <input value={form.phone} onChange={f('phone')} placeholder="+44 7700 …"
                  className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={finish} className="text-sm" style={{ color: '#334155' }}>Skip for now</button>
              <button
                onClick={() => setStep(2)}
                disabled={!form.firstName.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#003CA6' }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Ready */}
        {step === 2 && (
          <div className="p-7 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(16,185,129,0.15)' }}>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#f1f5f9' }}>
              You're all set, {form.firstName || userName}!
            </h2>
            <p className="text-sm mb-6" style={{ color: '#4e6680' }}>
              Your profile is saved. Your manager will assign courses to you — they'll appear on your dashboard.
              Check <strong style={{ color: '#94a3b8' }}>Knowledge Base</strong> for guides and articles you can read anytime.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: '📚', label: 'Complete your assigned courses' },
                { icon: '🏆', label: 'Earn certificates as you finish' },
                { icon: '📖', label: 'Read guides in the Knowledge Base' },
                { icon: '🔔', label: 'Check notifications for updates' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-left flex items-start gap-2"
                  style={{ background: '#132035', border: '1px solid #1e3a6e' }}>
                  <span className="text-lg leading-none">{item.icon}</span>
                  <p className="text-xs" style={{ color: '#64748b' }}>{item.label}</p>
                </div>
              ))}
            </div>
            <button onClick={finish} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white mx-auto disabled:opacity-50"
              style={{ background: '#003CA6' }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Go to My Learning
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
