import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseAssignments, lmsCourses, lmsUserRoles, lmsCertificates } from '@/lib/db/schema'
import { eq, lt, isNotNull, asc, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // Get all overdue assignments (dueDate < now)
  const assignments = await db
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
    .where(
      and(
        isNotNull(lmsCourseAssignments.dueDate),
        lt(lmsCourseAssignments.dueDate, now)
      )
    )
    .orderBy(asc(lmsCourseAssignments.dueDate))

  // Get all certificates (completed courses)
  const certificates = await db
    .select({ userId: lmsCertificates.userId, courseId: lmsCertificates.courseId })
    .from(lmsCertificates)

  const completedSet = new Set(certificates.map((c) => `${c.userId}:${c.courseId}`))

  // Filter out completed ones
  const overdue = assignments
    .filter((a) => !completedSet.has(`${a.userId}:${a.courseId}`))
    .map((a) => ({
      id: a.id,
      userId: a.userId,
      userDisplayName: a.userDisplayName ?? a.userEmail ?? a.userId,
      userEmail: a.userEmail ?? '',
      courseId: a.courseId,
      courseTitle: a.courseTitle,
      courseEmoji: a.courseEmoji,
      dueDate: a.dueDate,
      assignedAt: a.assignedAt,
    }))

  return NextResponse.json(overdue)
}
