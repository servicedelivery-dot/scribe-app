import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseAssignments, lmsEnrollments } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { userIds, courseIds, dueDate } = body as {
    userIds: string[]
    courseIds: string[]
    dueDate?: string
  }

  if (!Array.isArray(userIds) || !Array.isArray(courseIds) || userIds.length === 0 || courseIds.length === 0) {
    return NextResponse.json({ error: 'userIds and courseIds are required' }, { status: 400 })
  }

  let assigned = 0
  let enrolled = 0

  for (const targetUserId of userIds) {
    for (const courseId of courseIds) {
      // Check existing assignment
      const existingAssignment = await db
        .select()
        .from(lmsCourseAssignments)
        .where(and(eq(lmsCourseAssignments.userId, targetUserId), eq(lmsCourseAssignments.courseId, courseId)))

      if (existingAssignment.length === 0) {
        await db.insert(lmsCourseAssignments).values({
          userId: targetUserId,
          courseId,
          assignedBy: userId,
          ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        })
        assigned++
      }

      // Check existing enrollment
      const existingEnrollment = await db
        .select()
        .from(lmsEnrollments)
        .where(and(eq(lmsEnrollments.userId, targetUserId), eq(lmsEnrollments.courseId, courseId)))

      if (existingEnrollment.length === 0) {
        await db.insert(lmsEnrollments).values({ userId: targetUserId, courseId })
        enrolled++
      }
    }
  }

  return NextResponse.json({ assigned, enrolled })
}
