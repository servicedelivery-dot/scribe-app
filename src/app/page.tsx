import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Sparkles, FileText, Users } from 'lucide-react'

export default async function Home() {
  const { userId } = await auth()

  // Already signed in — skip the landing page
  if (userId) redirect('/lms')

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      {/* Background */}
      <Image src="/bg.png" alt="Airportr" fill className="object-cover opacity-40" priority />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,15,40,0.5) 0%, rgba(0,15,40,0.9) 100%)' }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <Image src="/logo.png" alt="Airportr" width={180} height={44} className="object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#00A3E0' }}>Academy</h1>
        </div>

        <p className="text-gray-300 text-xl mb-2 max-w-lg">
          Your learning management platform — create courses from screenshots, train your team, track progress.
        </p>
        <p className="text-gray-500 text-sm mb-10 max-w-sm">
          AI reads your content and builds structured courses, guides, and training materials.
        </p>

        <div className="flex items-center gap-3 mb-10 flex-wrap justify-center">
          {[
            { icon: <Sparkles className="w-4 h-4" />, label: 'AI Content Creation' },
            { icon: <GraduationCap className="w-4 h-4" />, label: 'LMS & Courses' },
            { icon: <Users className="w-4 h-4" />, label: 'Team Training' },
            { icon: <FileText className="w-4 h-4" />, label: 'Certificates' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border"
              style={{ background: 'rgba(0,60,166,0.2)', borderColor: 'rgba(0,163,224,0.3)', color: '#94c7e8' }}>
              {item.icon}{item.label}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/sign-in"
            className="px-8 py-3 text-white rounded-xl font-semibold transition-colors"
            style={{ background: '#003CA6' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
