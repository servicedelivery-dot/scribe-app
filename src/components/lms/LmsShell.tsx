'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import LmsSidebar from './LmsSidebar'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

const PAGE_TITLES: Record<string, string> = {
  '/lms': 'Academy Home',
  '/lms/announcements': 'Announcements',
  '/lms/analytics': 'Analytics',
  '/lms/profile': 'My Courses',
  '/lms/certificates': 'Certificates',
  '/lms/notifications': 'Notifications',
  '/lms/platform': 'Platform Overview',
  '/lms/team': 'Team Progress',
  '/lms/manage': 'Courses',
  '/lms/groups': 'Groups',
  '/lms/scribe-library': 'Scribe Library',
  '/lms/import': 'Import Content',
  '/lms/signoffs': 'Sign-offs',
  '/lms/users': 'User Management',
  '/lms/calendar': 'Calendar',
  '/lms/overdue': 'Overdue Courses',
  '/lms/activity': 'Activity Log',
  '/lms/feedback': 'Course Feedback',
  '/lms/paths': 'Learning Paths',
  '/lms/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pathname in PAGE_TITLES) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/lms/course/')) return 'Course'
  if (pathname.startsWith('/lms/learn/')) return 'Lesson'
  if (pathname.startsWith('/lms/manage/')) return 'Course Editor'
  return 'Academy'
}

const TOPBAR_H = 56

export default function LmsShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile sidebar on navigation
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Restore sidebar collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lms-sidebar-collapsed')
      if (saved === 'true') setCollapsed(true)
    } catch {}
  }, [])

  // ESC to close mobile sidebar
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem('lms-sidebar-collapsed', String(next)) } catch {}
  }

  const title = getPageTitle(pathname)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050d1a' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 h-screen',
          'lg:static lg:z-auto lg:translate-x-0 lg:flex-shrink-0',
          'transition-transform duration-300 ease-in-out will-change-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <LmsSidebar
          role={role}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header
          className="flex items-center gap-3 flex-shrink-0 px-4 sm:px-5"
          style={{
            height: TOPBAR_H,
            background: '#07111f',
            borderBottom: '1px solid #132035',
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden flex-shrink-0 p-2 -ml-1 rounded-lg transition-colors text-[#4e6680] hover:text-white hover:bg-white/6"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <p className="text-sm font-semibold hidden sm:block flex-shrink-0" style={{ color: '#94a3b8' }}>
            {title}
          </p>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden sm:block w-56 lg:w-64">
            <GlobalSearch />
          </div>

          {/* Notifications */}
          <NotificationBell />
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-auto scroll-touch">
          {children}
        </main>
      </div>
    </div>
  )
}
