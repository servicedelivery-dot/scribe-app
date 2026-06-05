import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseAssignments, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, isNotNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

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
    .where(isNotNull(lmsCourseAssignments.dueDate))

  let filtered = assignments
  if (month) {
    // month = 'YYYY-MM'
    const [year, mon] = month.split('-').map(Number)
    filtered = assignments.filter((a) => {
      if (!a.dueDate) return false
      const d = new Date(a.dueDate)
      return d.getFullYear() === year && d.getMonth() + 1 === mon
    })
  }

  const result = filtered.map((a) => ({
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

  return NextResponse.json(result)
}
