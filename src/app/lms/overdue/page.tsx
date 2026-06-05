import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsCourseAssignments, lmsCourses, lmsCertificates } from '@/lib/db/schema'
import { eq, isNotNull, lt, and, asc } from 'drizzle-orm'
import OverdueReport from '@/components/lms/OverdueReport'

export const dynamic = 'force-dynamic'

export default async function OverduePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(requester?.role ?? '')) redirect('/lms')

  const now = new Date()

  const rows = await db
    .select({
      id: lmsCourseAssignments.id,
      userId: lmsCourseAssignments.userId,
      courseId: lmsCourseAssignments.courseId,
      dueDate: lmsCourseAssignments.dueDate,
      assignedAt: lmsCourseAssignments.assignedAt,
      courseTitle: lmsCourses.title,
      courseEmoji: lmsCourses.emoji,
      userDisplayName: lmsUserRoles.displayName,
      userEmail: lmsUserRoles.email,
    })
    .from(lmsCourseAssignments)
    .innerJoin(lmsCourses, eq(lmsCourseAssignments.courseId, lmsCourses.id))
    .leftJoin(lmsUserRoles, eq(lmsCourseAssignments.userId, lmsUserRoles.userId))
    .where(and(isNotNull(lmsCourseAssignments.dueDate), lt(lmsCourseAssignments.dueDate, now)))
    .orderBy(asc(lmsCourseAssignments.dueDate))

  const certificates = await db
    .select({ userId: lmsCertificates.userId, courseId: lmsCertificates.courseId })
    .from(lmsCertificates)

  const completedSet = new Set(certificates.map(c => `${c.userId}:${c.courseId}`))

  const assignments = rows
    .filter(a => !completedSet.has(`${a.userId}:${a.courseId}`))
    .map(a => ({
      id: a.id,
      userId: a.userId,
      userDisplayName: a.userDisplayName ?? a.userEmail ?? a.userId,
      userEmail: a.userEmail ?? '',
      courseId: a.courseId,
      courseTitle: a.courseTitle,
      courseEmoji: a.courseEmoji,
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString() : new Date().toISOString(),
      assignedAt: new Date(a.assignedAt).toISOString(),
    }))

  return (
    <div style={{ minHeight: '100vh', background: '#0d1b2e', color: '#e2e8f0', padding: '2rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', color: '#ffffff' }}>
          ⚠️ Overdue Assignments
        </h1>
        <OverdueReport assignments={assignments} />
      </div>
    </div>
  )
}
