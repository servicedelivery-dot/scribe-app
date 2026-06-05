import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsCertificates } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  if (!course.prerequisiteCourseId) {
    return NextResponse.json({ canEnroll: true, prerequisite: null })
  }

  // Check if user has certificate for the prerequisite course
  const certs = await db
    .select()
    .from(lmsCertificates)
    .where(and(eq(lmsCertificates.userId, userId), eq(lmsCertificates.courseId, course.prerequisiteCourseId)))

  const [prereqCourse] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, course.prerequisiteCourseId))

  return NextResponse.json({
    canEnroll: certs.length > 0,
    prerequisite: prereqCourse
      ? { id: prereqCourse.id, title: prereqCourse.title, emoji: prereqCourse.emoji }
      : null,
  })
}
