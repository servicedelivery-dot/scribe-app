'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, BarChart2, Users, Award, Megaphone, TrendingUp, GraduationCap, UserCircle, Library, Layers, Calendar, AlertTriangle, ClipboardCheck, Activity, Search, Upload, BarChart, Star, Bell, Route, Settings } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

interface NavLink {
  href: string
  icon: React.ReactNode
  label: string
  roles: Role[]
}

interface NavSection {
  label: string
  links: NavLink[]
}

const sections: NavSection[] = [
  { label: 'Overview', links: [
    { href: '/lms', icon: <GraduationCap className="w-4 h-4" />, label: 'Academy Home', roles: ['owner', 'admin', 'manager', 'learner'] },
    { href: '/lms/announcements', icon: <Megaphone className="w-4 h-4" />, label: 'Announcements', roles: ['owner', 'admin', 'manager', 'learner'] },
    { href: '/lms/analytics', icon: <TrendingUp className="w-4 h-4" />, label: 'Analytics', roles: ['owner', 'admin', 'manager'] },
  ]},
  { label: 'My Learning', links: [
    { href: '/lms/profile', icon: <UserCircle className="w-4 h-4" />, label: 'My Courses', roles: ['learner'] },
    { href: '/lms/certificates', icon: <Award className="w-4 h-4" />, label: 'Certificates', roles: ['owner', 'admin', 'manager', 'learner'] },
    { href: '/lms/notifications', icon: <Bell className="w-4 h-4" />, label: 'Notifications', roles: ['owner', 'admin', 'manager', 'learner'] },
  ]},
  { label: 'Manage', links: [
    { href: '/lms/platform', icon: <BarChart className="w-4 h-4" />, label: 'Platform Overview', roles: ['owner', 'admin'] },
    { href: '/lms/team', icon: <Users className="w-4 h-4" />, label: 'Team Progress', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/manage', icon: <BookOpen className="w-4 h-4" />, label: 'Courses', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/groups', icon: <Layers className="w-4 h-4" />, label: 'Groups', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/scribe-library', icon: <Library className="w-4 h-4" />, label: 'Scribe Library', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/import', icon: <Upload className="w-4 h-4" />, label: 'Import Content', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/signoffs', icon: <ClipboardCheck className="w-4 h-4" />, label: 'Sign-offs', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/users', icon: <Users className="w-4 h-4" />, label: 'Users', roles: ['owner', 'admin'] },
  ]},
  { label: 'Reports', links: [
    { href: '/lms/calendar', icon: <Calendar className="w-4 h-4" />, label: 'Calendar', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/overdue', icon: <AlertTriangle className="w-4 h-4" />, label: 'Overdue', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/activity', icon: <Activity className="w-4 h-4" />, label: 'Activity Log', roles: ['owner', 'admin', 'manager'] },
    { href: '/lms/feedback', icon: <Star className="w-4 h-4" />, label: 'Course Feedback', roles: ['owner', 'admin', 'manager'] },
  ]},
  { label: 'Tools', links: [
    { href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Content Creator', roles: ['owner', 'admin', 'manager'] },
    { href: '/dashboard/usage', icon: <BarChart2 className="w-4 h-4" />, label: 'Usage', roles: ['owner', 'admin'] },
    { href: '/lms/paths', icon: <Route className="w-4 h-4" />, label: 'Learning Paths', roles: ['owner', 'admin', 'manager', 'learner'] },
    { href: '/lms/settings', icon: <Settings className="w-4 h-4" />, label: 'Settings', roles: ['owner', 'admin'] },
  ]},
]

const STANDALONE_LMS_URL = process.env.NEXT_PUBLIC_STANDALONE_LMS_URL || ''

export default function LmsSidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()

  const visibleSections = sections
    .map(sec => ({ ...sec, links: sec.links.filter(l => l.roles.includes(role)) }))
    .filter(sec => sec.links.length > 0)

  return (
    <aside className="w-64 h-full flex-shrink-0 flex flex-col" style={{ background: '#001228', borderRight: '1px solid #0d2545' }}>
      <div className="p-4 border-b" style={{ borderColor: '#0d2545' }}>
        <Link href="/lms" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Airportr" width={120} height={28} className="object-contain" />
        </Link>
        <p className="text-xs mt-1.5" style={{ color: '#00A3E0' }}>Academy</p>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
        {visibleSections.map(sec => (
          <div key={sec.label}>
            <p className="text-xs font-semibold uppercase tracking-wide px-3 mb-1" style={{ color: '#334155' }}>{sec.label}</p>
            <div className="space-y-0.5">
              {sec.links.map(l => (
                <Link key={l.href} href={l.href} onClick={onNavigate}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{
                    background: pathname === l.href ? 'rgba(0,60,166,0.25)' : 'transparent',
                    color: pathname === l.href ? '#00A3E0' : '#94a3b8',
                  }}>
                  {l.icon}{l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Standalone LMS cross-link — visible when env var is set */}
      {STANDALONE_LMS_URL && (
        <div className="px-3 pb-2">
          <a
            href={STANDALONE_LMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full transition-colors hover:bg-white/5"
            style={{ color: '#475569', border: '1px dashed #1e3a6e' }}
          >
            <span>📄</span>
            <span className="flex-1">Standalone LMS</span>
            <span style={{ fontSize: 10 }}>↗</span>
          </a>
        </div>
      )}

      <div className="p-4 border-t flex items-center gap-3" style={{ borderColor: '#0d2545' }}>
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
        <span className="text-xs capitalize px-2 py-0.5 rounded-full font-medium"
          style={{
            background: role === 'owner' ? 'rgba(168,85,247,0.15)' : role === 'admin' ? 'rgba(239,68,68,0.15)' : role === 'manager' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.2)',
            color: role === 'owner' ? '#d8b4fe' : role === 'admin' ? '#fca5a5' : role === 'manager' ? '#93c5fd' : '#94a3b8',
          }}>
          {role}
        </span>
      </div>
    </aside>
  )
}
