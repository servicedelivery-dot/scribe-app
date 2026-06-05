'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart2, GraduationCap } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import Image from 'next/image'

export default function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Content Creator' },
    { href: '/lms', icon: <GraduationCap className="w-4 h-4" />, label: 'Academy' },
    { href: '/dashboard/usage', icon: <BarChart2 className="w-4 h-4" />, label: 'Usage' },
  ]

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#001228', borderRight: '1px solid #0d2545' }}>
      <div className="p-4 border-b" style={{ borderColor: '#0d2545' }}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Airportr" width={120} height={28} className="object-contain" />
        </Link>
        <p className="text-xs mt-1.5" style={{ color: '#00A3E0' }}>Content Creator</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: pathname === l.href ? 'rgba(0,60,166,0.25)' : 'transparent',
              color: pathname === l.href ? '#00A3E0' : '#94a3b8',
            }}
          >
            {l.icon}{l.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: '#0d2545' }}>
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
      </div>
    </aside>
  )
}
