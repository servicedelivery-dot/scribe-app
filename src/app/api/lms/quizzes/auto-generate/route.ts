import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons, lmsQuizQuestions } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId } = await req.json()

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const lessons = await db.select().from(lmsLessons)
    .where(eq(lmsLessons.courseId, courseId))
    .orderBy(asc(lmsLessons.orderIndex))

  if (!lessons.length) return NextResponse.json({ error: 'No lessons found' }, { status: 400 })

  // Build course content summary for AI
  const contentSummary = lessons
    .filter(l => l.content?.trim())
    .map((l, i) => `Lesson ${i + 1}: ${l.title}\n${l.content?.slice(0, 500)}`)
    .join('\n\n')

  const prompt = `You are creating quiz questions for a course titled "${course.title}".

Based on this course content:
${contentSummary}

Generate exactly 5 multiple-choice quiz questions that test understanding of the key concepts.

Return ONLY valid JSON in this exact format:
[
  {
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Because..."
  }
]

Rules:
- 4 options per question
- correctIndex is 0-3
- Questions should test real understanding, not just memorisation
- Mix easy and harder questions`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: prompt }]

  try {
    let text = (await generateWithRetry(parts)).trim()
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
    const questions = JSON.parse(text) as { question: string; options: string[]; correctIndex: number; explanation: string }[]

    // Delete existing auto-generated questions for this course (end-of-course ones)
    await db.delete(lmsQuizQuestions)
      .where(eq(lmsQuizQuestions.courseId, courseId))

    // Insert new questions
    const inserted = []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue
      const [row] = await db.insert(lmsQuizQuestions).values({
        courseId,
        lessonId: null, // end-of-course quiz
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || null,
        orderIndex: i,
      }).returning()
      inserted.push(row)
    }

    return NextResponse.json({ generated: inserted.length, questions: inserted })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 })
  }
}
