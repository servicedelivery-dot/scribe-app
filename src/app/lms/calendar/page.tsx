import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsCourseAssignments, lmsCourses } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'
import CalendarView from '@/components/lms/CalendarView'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(requester?.role ?? '')) redirect('/lms')

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
    .where(isNotNull(lmsCourseAssignments.dueDate))

  const assignments = rows.map(a => ({
    id: a.id,
    userId: a.userId,
    userDisplayName: a.userDisplayName ?? a.userEmail ?? a.userId,
    userEmail: a.userEmail ?? '',
    courseId: a.courseId,
    courseTitle: a.courseTitle,
    courseEmoji: a.courseEmoji,
    dueDate: a.dueDate ? new Date(a.dueDate).toISOString() : null,
    assignedAt: new Date(a.assignedAt).toISOString(),
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#0d1b2e', color: '#e2e8f0', padding: '2rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', color: '#ffffff' }}>
          📅 Assignment Calendar
        </h1>
        <CalendarView assignments={assignments} />
      </div>
    </div>
  )
}
