import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsProgress, lmsLessons, lmsQuizQuestions, lmsCertificates, lmsUserRoles } from '@/lib/db/schema'
import { and, eq, count } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, courseId } = await req.json()

  // Mark lesson complete (idempotent)
  const existing = await db.select().from(lmsProgress)
    .where(and(eq(lmsProgress.lessonId, lessonId), eq(lmsProgress.userId, userId)))
  if (!existing.length) {
    await db.insert(lmsProgress).values({ userId, lessonId, courseId })
  }

  // Check if all lessons in this course are now completed
  const [{ total }] = await db.select({ total: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, courseId))
  const completedRows = await db.select().from(lmsProgress)
    .where(and(eq(lmsProgress.courseId, courseId), eq(lmsProgress.userId, userId)))
  const completedCount = completedRows.length

  if (completedCount < total) {
    // Not done yet
    return NextResponse.json({ success: true, allComplete: false })
  }

  // All lessons done — check for end-of-course quiz
  const allQ = await db.select().from(lmsQuizQuestions).where(eq(lmsQuizQuestions.courseId, courseId))
  const endQuizQ = allQ.filter(q => q.lessonId === null)
  if (endQuizQ.length > 0) {
    // Has a quiz — don't auto-cert, let the quiz flow handle it
    return NextResponse.json({ success: true, allComplete: true, hasQuiz: true })
  }

  // No quiz — auto-issue certificate if not already issued
  const existingCert = await db.select().from(lmsCertificates)
    .where(and(eq(lmsCertificates.userId, userId), eq(lmsCertificates.courseId, courseId)))
  if (existingCert.length) {
    return NextResponse.json({ success: true, allComplete: true, hasQuiz: false, certificate: existingCert[0] })
  }

  // Fetch name from user roles
  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const recipientName = userRole?.displayName ?? userRole?.email ?? 'Learner'

  // Fetch course title from DB
  const { lmsCourses } = await import('@/lib/db/schema')
  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))

  const certNumber = `CERT-${nanoid(10).toUpperCase()}`
  const [cert] = await db.insert(lmsCertificates).values({
    userId, courseId,
    certificateNumber: certNumber,
    recipientName,
    courseTitle: course?.title ?? 'Course',
  }).returning()

  return NextResponse.json({ success: true, allComplete: true, hasQuiz: false, certificate: cert })
}
