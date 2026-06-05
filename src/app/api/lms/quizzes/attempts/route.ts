import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsQuizAttempts, lmsQuizQuestions, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/lms/quizzes/attempts?courseId=xxx
// Returns all quiz attempts for a course, enriched with user info and per-question breakdown
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const [attempts, questions] = await Promise.all([
    db.select({
      id: lmsQuizAttempts.id,
      userId: lmsQuizAttempts.userId,
      lessonId: lmsQuizAttempts.lessonId,
      answers: lmsQuizAttempts.answers,
      score: lmsQuizAttempts.score,
      passed: lmsQuizAttempts.passed,
      attemptedAt: lmsQuizAttempts.attemptedAt,
      displayName: lmsUserRoles.displayName,
      email: lmsUserRoles.email,
    })
      .from(lmsQuizAttempts)
      .leftJoin(lmsUserRoles, eq(lmsQuizAttempts.userId, lmsUserRoles.userId))
      .where(eq(lmsQuizAttempts.courseId, courseId))
      .orderBy(desc(lmsQuizAttempts.attemptedAt)),
    db.select().from(lmsQuizQuestions).where(eq(lmsQuizQuestions.courseId, courseId)),
  ])

  // Build a question map: lessonId (or 'end') → questions
  const questionMap: Record<string, typeof questions> = {}
  for (const q of questions) {
    const key = q.lessonId ?? 'end'
    if (!questionMap[key]) questionMap[key] = []
    questionMap[key].push(q)
  }

  const enriched = attempts.map(a => {
    const key = a.lessonId ?? 'end'
    const qs = questionMap[key] ?? []
    const breakdown = qs.map((q, i) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      userAnswer: (a.answers as number[])[i] ?? -1,
      correct: (a.answers as number[])[i] === q.correctIndex,
      explanation: q.explanation,
    }))
    return {
      id: a.id,
      userId: a.userId,
      name: a.displayName ?? a.email ?? a.userId,
      email: a.email ?? '',
      lessonId: a.lessonId,
      isEndOfCourse: !a.lessonId,
      score: a.score,
      passed: a.passed,
      attemptedAt: a.attemptedAt,
      breakdown,
    }
  })

  return NextResponse.json(enriched)
}
