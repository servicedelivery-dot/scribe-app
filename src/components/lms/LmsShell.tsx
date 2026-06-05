'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import LmsSidebar from './LmsSidebar'
import GlobalSearch from './GlobalSearch'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

export default function LmsShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close sidebar when navigating (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showSearch = role !== 'learner'
  // Show topbar if: mobile always (for hamburger) or desktop with search
  // On desktop with no search (learner), the topbar is hidden entirely
  const showTopbar = true // hamburger always needed on mobile

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ──
          Mobile: fixed, slides in/out
          Desktop (lg+): static, always visible  */}
      <aside className={[
        'fixed inset-y-0 left-0 z-50 h-screen',
        'lg:static lg:z-auto lg:translate-x-0 lg:h-auto lg:flex-shrink-0',
        'transition-transform duration-300 ease-in-out will-change-transform',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        <LmsSidebar role={role} onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Right side: topbar + content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar
            Mobile: always visible (hamburger + search)
            Desktop: hidden for learners (no hamburger, no search needed)
                     visible for admin/manager/owner (search) */}
        <div className={[
          'flex items-center gap-3 flex-shrink-0 px-3 sm:px-4',
          // hide on desktop when learner has no search
          !showSearch ? 'lg:hidden' : '',
        ].join(' ')}
          style={{ height: 48, background: '#080f1e', borderBottom: '1px solid #1e3a6e' }}>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700 transition-colors"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search bar — non-learner only */}
          {showSearch && (
            <div className="flex-1 min-w-0">
              <GlobalSearch />
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto scroll-touch">
          {children}
        </main>
      </div>
    </div>
  )
}
