'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import LmsSidebar from './LmsSidebar'
import GlobalSearch from './GlobalSearch'

type Role = 'owner' | 'admin' | 'manager' | 'learner'

export default function LmsShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [])

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showSearch = role !== 'learner'

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <LmsSidebar role={role} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Topbar — always visible on mobile for hamburger + search */}
        <div
          className="flex items-center gap-3 flex-shrink-0 px-4"
          style={{
            height: 48,
            background: '#080f1e',
            borderBottom: '1px solid #1e3a6e',
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search — non-learner only */}
          {showSearch && <div className="flex-1 min-w-0"><GlobalSearch /></div>}
        </div>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
