import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import LmsSidebar from '@/components/lms/LmsSidebar'
import GlobalSearch from '@/components/lms/GlobalSearch'

export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = (userRole?.role ?? 'learner') as 'owner' | 'admin' | 'manager' | 'learner'

  const showSearch = role !== 'learner'

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <LmsSidebar role={role} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        {showSearch && (
          <div
            style={{
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              background: '#080f1e',
              borderBottom: '1px solid #1e3a6e',
              flexShrink: 0,
            }}
          >
            <GlobalSearch />
          </div>
        )}
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}
