'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  LayoutDashboard, BookOpen, BarChart2, Users, Award, Megaphone, TrendingUp,
  GraduationCap, UserCircle, Library, Layers, Calendar, AlertTriangle,
  ClipboardCheck, Activity, Upload, BarChart, Star, Bell, Route, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

interface NavLink { href: string; icon: React.ReactNode; label: string; roles: Role[] }
interface NavSection { label: string; links: NavLink[] }

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

const ROLE_COLOR: Record<Role, string> = {
  owner: '#d8b4fe',
  admin: '#fca5a5',
  manager: '#93c5fd',
  learner: '#94a3b8',
}
const ROLE_BG: Record<Role, string> = {
  owner: 'rgba(168,85,247,0.12)',
  admin: 'rgba(239,68,68,0.12)',
  manager: 'rgba(59,130,246,0.12)',
  learner: 'rgba(100,116,139,0.15)',
}


export default function LmsSidebar({
  role,
  collapsed,
  onToggle,
  onNavigate,
}: {
  role: Role
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user } = useUser()

  const visibleSections = sections
    .map(sec => ({ ...sec, links: sec.links.filter(l => l.roles.includes(role)) }))
    .filter(sec => sec.links.length > 0)

  function isActive(href: string) {
    if (href === '/lms') return pathname === '/lms'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? 64 : 240,
        background: '#070f1d',
        borderRight: '1px solid #152035',
      }}
    >
      {/* Header — logo + collapse toggle */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ height: 56, borderBottom: '1px solid #152035', padding: '0 14px', gap: 8 }}
      >
        {collapsed ? (
          /* Collapsed: full row is the expand button */
          <button
            onClick={onToggle}
            className="hidden lg:flex w-full items-center justify-center rounded-lg transition-colors hover:bg-white/6"
            style={{ height: 36, color: '#4e6680' }}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          /* Expanded: logo on left, collapse button on right */
          <>
            <Link
              href="/lms"
              onClick={onNavigate}
              className="flex items-center flex-1 min-w-0"
            >
              <div className="relative" style={{ width: 130, height: 40 }}>
                <Image src="/logo.png" alt="Airportr Academy" fill className="object-contain object-left" />
              </div>
            </Link>

            <button
              onClick={onToggle}
              className="hidden lg:flex flex-shrink-0 items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/6"
              style={{ color: '#334155' }}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: collapsed ? '12px 8px' : '12px 8px' }}>
        {visibleSections.map((sec, si) => (
          <div key={sec.label} className={si > 0 ? 'mt-5' : ''}>
            {/* Section label */}
            {!collapsed && (
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: '#283d5e', paddingLeft: 10 }}
              >
                {sec.label}
              </p>
            )}
            {collapsed && si > 0 && (
              <div className="my-3 mx-1" style={{ height: 1, background: '#152035' }} />
            )}

            <div className="space-y-0.5">
              {sec.links.map(l => {
                const active = isActive(l.href)
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={onNavigate}
                    title={collapsed ? l.label : undefined}
                    className="flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 group"
                    style={{
                      padding: collapsed ? '8px 0' : '7px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active ? 'rgba(0,163,224,0.09)' : 'transparent',
                      color: active ? '#e2e8f0' : '#4e6680',
                      borderLeft: active && !collapsed ? '2px solid #00A3E0' : '2px solid transparent',
                      marginLeft: collapsed ? 0 : 0,
                    }}
                  >
                    <span style={{ color: active ? '#00A3E0' : '#4e6680', flexShrink: 0 }}
                      className="transition-colors group-hover:!text-[#94a3b8]">
                      {l.icon}
                    </span>
                    {!collapsed && (
                      <span className="truncate transition-colors group-hover:text-[#cbd5e1]"
                        style={{ color: active ? '#f1f5f9' : '#4e6680' }}>
                        {l.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

      </nav>

      {/* User section */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          borderTop: '1px solid #152035',
          padding: collapsed ? '12px 0' : '12px 14px',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 60,
        }}
      >
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
              {user?.fullName || user?.emailAddresses?.[0]?.emailAddress || '—'}
            </p>
            <span
              className="text-xs capitalize font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: ROLE_BG[role], color: ROLE_COLOR[role] }}
            >
              {role}
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
