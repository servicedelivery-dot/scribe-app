import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import LmsShell from '@/components/lms/LmsShell'

export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = (userRole?.role ?? 'learner') as 'owner' | 'admin' | 'manager' | 'learner'

  return <LmsShell role={role}>{children}</LmsShell>
}
