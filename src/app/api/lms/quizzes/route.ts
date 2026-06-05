import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsQuizQuestions, lmsQuizAttempts, lmsCertificates, lmsProgress, lmsLessons } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

// Get questions for a course/lesson
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')!
  const lessonId = searchParams.get('lessonId') ?? null
  const endOfCourse = searchParams.get('endOfCourse') === '1'

  let questions
  if (endOfCourse || (!lessonId && !endOfCourse)) {
    // End-of-course quiz: lessonId IS NULL
    const all = await db.select().from(lmsQuizQuestions)
      .where(eq(lmsQuizQuestions.courseId, courseId))
      .orderBy(asc(lmsQuizQuestions.orderIndex))
    questions = all.filter(q => q.lessonId === null)
  } else {
    questions = await db.select().from(lmsQuizQuestions)
      .where(and(eq(lmsQuizQuestions.courseId, courseId), eq(lmsQuizQuestions.lessonId, lessonId!)))
      .orderBy(asc(lmsQuizQuestions.orderIndex))
  }

  return NextResponse.json(questions)
}

// Add a question
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, lessonId, question, options, correctIndex, explanation, orderIndex } = await req.json()
  const [q] = await db.insert(lmsQuizQuestions).values({
    courseId, lessonId: lessonId || null, question, options, correctIndex,
    explanation: explanation || null, orderIndex: orderIndex ?? 0,
  }).returning()
  return NextResponse.json(q)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.delete(lmsQuizQuestions).where(eq(lmsQuizQuestions.id, id))
  return NextResponse.json({ success: true })
}
