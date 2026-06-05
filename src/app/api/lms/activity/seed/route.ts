import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  lmsActivityLog,
  lmsEnrollments,
  lmsCertificates,
  lmsProgress,
  lmsQuizAttempts,
  lmsUserRoles,
  lmsCourses,
  lmsLessons,
} from '@/lib/db/schema'
import { count, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Skip if already has entries
  const [{ count: existingCount }] = await db.select({ count: count() }).from(lmsActivityLog)
  if (Number(existingCount) > 0) {
    return NextResponse.json({ message: 'Activity log already has entries, skipping seed.', count: existingCount })
  }

  // Load user roles for actor names
  const userRoles = await db.select().from(lmsUserRoles)
  const nameMap: Record<string, string> = {}
  for (const ur of userRoles) {
    nameMap[ur.userId] = ur.displayName ?? ur.email ?? ur.userId
  }

  const getName = (uid: string) => nameMap[uid] ?? 'Unknown User'

  // Load course titles
  const courses = await db.select({ id: lmsCourses.id, title: lmsCourses.title }).from(lmsCourses)
  const courseTitleMap: Record<string, string> = {}
  for (const c of courses) courseTitleMap[c.id] = c.title

  // Load lesson titles
  const lessons = await db.select({ id: lmsLessons.id, title: lmsLessons.title }).from(lmsLessons)
  const lessonTitleMap: Record<string, string> = {}
  for (const l of lessons) lessonTitleMap[l.id] = l.title

  const rows: (typeof lmsActivityLog.$inferInsert)[] = []

  // Enrollments
  const enrollments = await db.select().from(lmsEnrollments)
  for (const e of enrollments) {
    rows.push({
      userId: e.userId,
      actorName: getName(e.userId),
      action: 'enrolled',
      entityType: 'course',
      entityId: e.courseId,
      entityName: courseTitleMap[e.courseId] ?? 'Unknown Course',
      meta: null,
      createdAt: e.enrolledAt,
    })
  }

  // Lesson completions
  const progress = await db.select().from(lmsProgress)
  for (const p of progress) {
    rows.push({
      userId: p.userId,
      actorName: getName(p.userId),
      action: 'lesson_completed',
      entityType: 'lesson',
      entityId: p.lessonId,
      entityName: lessonTitleMap[p.lessonId] ?? 'Unknown Lesson',
      meta: { courseId: p.courseId, courseName: courseTitleMap[p.courseId] } as Record<string, unknown>,
      createdAt: p.completedAt,
    })
  }

  // Quiz passes (only passed attempts)
  const quizAttempts = await db.select().from(lmsQuizAttempts).where(eq(lmsQuizAttempts.passed, true))
  for (const q of quizAttempts) {
    rows.push({
      userId: q.userId,
      actorName: getName(q.userId),
      action: 'quiz_passed',
      entityType: 'quiz',
      entityId: q.courseId,
      entityName: courseTitleMap[q.courseId] ?? 'Unknown Course',
      meta: { score: q.score, lessonId: q.lessonId } as Record<string, unknown>,
      createdAt: q.attemptedAt,
    })
  }

  // Certificates
  const certs = await db.select().from(lmsCertificates)
  for (const c of certs) {
    rows.push({
      userId: c.userId,
      actorName: c.recipientName ?? getName(c.userId),
      action: 'certificate_earned',
      entityType: 'course',
      entityId: c.courseId,
      entityName: c.courseTitle ?? courseTitleMap[c.courseId] ?? 'Unknown Course',
      meta: { certificateNumber: c.certificateNumber } as Record<string, unknown>,
      createdAt: c.issuedAt,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ message: 'No source data found to seed from.', inserted: 0 })
  }

  // Insert in batches of 100
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    await db.insert(lmsActivityLog).values(batch)
    inserted += batch.length
  }

  return NextResponse.json({ message: `Seeded ${inserted} activity log entries.`, inserted })
}
