import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsSignoffs, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import SignoffsManager from '@/components/lms/SignoffsManager'

export const dynamic = 'force-dynamic'

export default async function SignoffsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = userRole?.role
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') redirect('/lms')

  const rows = await db.select().from(lmsSignoffs).orderBy(desc(lmsSignoffs.requestedAt))

  const enriched = await Promise.all(rows.map(async r => {
    const [course] = await db.select({ title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).where(eq(lmsCourses.id, r.courseId))
    const [ur] = await db.select({ displayName: lmsUserRoles.displayName, email: lmsUserRoles.email })
      .from(lmsUserRoles).where(eq(lmsUserRoles.userId, r.userId))
    return {
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      courseTitle: course?.title ?? 'Unknown',
      courseEmoji: course?.emoji ?? '📚',
      userDisplayName: ur?.displayName ?? r.userId,
      userEmail: ur?.email ?? '',
    }
  }))

  const courses = await db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji }).from(lmsCourses)

  return <SignoffsManager initialSignoffs={enriched} courses={courses} />
}
