import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsQuizQuestions, lmsLessons, lmsCourses } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, courseId, description } = await req.json()
  if (!lessonId || !courseId) return NextResponse.json({ error: 'lessonId and courseId required' }, { status: 400 })

  // Fetch lesson + course for context
  const [lesson] = await db.select().from(lmsLessons).where(eq(lmsLessons.id, lessonId))
  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!lesson || !course) return NextResponse.json({ error: 'Lesson or course not found' }, { status: 404 })

  // Build context — use markdown content if available, else title + description
  let contentContext = ''
  const parsed = (() => { try { return JSON.parse(lesson.content) } catch { return null } })()
  const isStructured = parsed && (parsed.__scribe || parsed.__pdf || parsed.__video || parsed.__embed || parsed.__url || parsed.__html)

  if (isStructured) {
    // No readable text — use title + user-supplied description
    contentContext = `Lesson title: "${lesson.title}"\n${description ? `Context provided by admin: ${description}` : 'No additional context.'}`
  } else {
    contentContext = `Lesson title: "${lesson.title}"\n\nContent:\n${lesson.content?.slice(0, 1500) || '(no content)'}`
  }

  const prompt = `You are creating a quiz for an employee training lesson at a company called "${course.title}".

Lesson being tested:
${contentContext}

Generate exactly 5 multiple-choice questions that test a learner's understanding of this specific lesson.

Return ONLY valid JSON — no markdown, no explanation:
[
  {
    "question": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "..."
  }
]

Rules:
- 4 options per question, correctIndex is 0–3
- Questions must be directly relevant to the lesson title/content
- Include practical, scenario-based questions where possible
- Vary difficulty — mix straightforward recall and applied understanding`

  try {
    let text = (await generateWithRetry([{ text: prompt }])).trim()
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
    const questions = JSON.parse(text) as { question: string; options: string[]; correctIndex: number; explanation: string }[]

    // Delete existing questions for this specific lesson
    await db.delete(lmsQuizQuestions)
      .where(and(eq(lmsQuizQuestions.courseId, courseId), eq(lmsQuizQuestions.lessonId, lessonId)))

    const inserted = []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue
      const [row] = await db.insert(lmsQuizQuestions).values({
        courseId,
        lessonId,
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
