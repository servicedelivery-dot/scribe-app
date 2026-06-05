import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsQuizQuestions, lmsQuizAttempts, lmsCertificates, lmsProgress, lmsLessons, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const PASS_THRESHOLD = 70 // 70% to pass

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, lessonId, answers } = await req.json() as { courseId: string; lessonId: string | null; answers: number[] }

  const questions = lessonId
    ? await db.select().from(lmsQuizQuestions).where(and(eq(lmsQuizQuestions.courseId, courseId), eq(lmsQuizQuestions.lessonId, lessonId)))
    : await db.select().from(lmsQuizQuestions).where(and(eq(lmsQuizQuestions.courseId, courseId), isNull(lmsQuizQuestions.lessonId)))

  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  const passed = score >= PASS_THRESHOLD

  await db.insert(lmsQuizAttempts).values({ userId, courseId, lessonId: lessonId || null, answers, score, passed })

  let certificate = null

  // If end-of-course quiz and passed → issue certificate
  if (!lessonId && passed) {
    const existing = await db.select().from(lmsCertificates).where(and(eq(lmsCertificates.userId, userId), eq(lmsCertificates.courseId, courseId)))
    if (!existing.length) {
      const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
      const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
      const recipientName = userRole?.displayName ?? userRole?.email ?? 'Learner'
      const certNumber = `CERT-${nanoid(10).toUpperCase()}`
      const [cert] = await db.insert(lmsCertificates).values({
        userId, courseId, certificateNumber: certNumber,
        recipientName, courseTitle: course?.title ?? 'Course',
      }).returning()
      certificate = cert
    } else {
      certificate = existing[0]
    }
  }

  // Grade breakdown per question
  const breakdown = questions.map((q, i) => ({
    question: q.question,
    yourAnswer: answers[i] ?? -1,
    correctAnswer: q.correctIndex,
    correct: answers[i] === q.correctIndex,
    explanation: q.explanation,
    options: q.options,
  }))

  return NextResponse.json({ score, passed, correct, total: questions.length, breakdown, certificate })
}
