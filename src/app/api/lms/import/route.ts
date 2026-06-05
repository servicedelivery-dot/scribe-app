import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsLessons, lmsModules, lmsCourses, lmsQuizQuestions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, title, content, fileUrl, fileName, courseId, moduleId, generateQuiz, quizDescription } = body

  if (!title || !courseId || !moduleId || !type) {
    return NextResponse.json({ error: 'title, courseId, moduleId and type are required' }, { status: 400 })
  }

  // Determine lesson content and type based on import type
  let lessonContent = ''
  let lessonType = 'markdown'

  switch (type) {
    case 'text':
    case 'markdown':
      lessonContent = content || ''
      lessonType = 'markdown'
      break

    case 'html':
      lessonContent = JSON.stringify({ __html: true, html: content || '' })
      lessonType = 'html'
      break

    case 'pdf':
      lessonContent = JSON.stringify({ __pdf: true, url: fileUrl, name: fileName })
      lessonType = 'pdf'
      break

    case 'docx': {
      // Extract text from DOCX using mammoth if fileUrl provided
      let extracted = content || ''
      if (fileUrl && !content) {
        try {
          const mammoth = await import('mammoth')
          const fileRes = await fetch(fileUrl)
          const arrayBuffer = await fileRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const result = await mammoth.convertToMarkdown({ buffer })
          extracted = result.value
        } catch (e) {
          console.error('DOCX extraction failed:', e)
          extracted = `*Could not extract text from ${fileName}. [Download original](${fileUrl})*`
        }
      }
      lessonContent = extracted
      lessonType = 'markdown'
      break
    }

    case 'scribe':
      lessonContent = JSON.stringify({
        __scribe: true,
        slides: body.slidesUrl || '',
        movie: body.movieUrl || '',
        scroll: body.scrollUrl || '',
      })
      lessonType = 'scribe'
      break

    case 'video': {
      const videoUrl = fileUrl || content || ''
      lessonContent = JSON.stringify({ __video: true, url: videoUrl, name: fileName || title })
      lessonType = 'video'
      break
    }

    case 'embed':
      lessonContent = JSON.stringify({ __embed: true, html: content || '' })
      lessonType = 'embed'
      break

    case 'url':
      lessonContent = JSON.stringify({ __url: true, url: content || '', label: title })
      lessonType = 'url'
      break

    default:
      lessonContent = content || ''
      lessonType = 'markdown'
  }

  // Get current lesson count in module for ordering
  const existing = await db.select().from(lmsLessons).where(eq(lmsLessons.moduleId, moduleId))

  const [lesson] = await db.insert(lmsLessons).values({
    moduleId,
    courseId,
    title,
    content: lessonContent,
    lessonType,
    orderIndex: existing.length,
  }).returning()

  // Optionally generate quiz questions for this lesson via AI
  let quizGenerated = 0
  if (generateQuiz) {
    try {
      const isStructured = ['scribe', 'pdf', 'video', 'embed', 'url', 'html'].includes(lessonType)
      const contentContext = isStructured
        ? `Lesson title: "${title}"\n${quizDescription ? `Context: ${quizDescription}` : 'No additional context.'}`
        : `Lesson title: "${title}"\n\nContent:\n${lessonContent.slice(0, 1500)}`

      const prompt = `Generate exactly 5 multiple-choice quiz questions for this training lesson.

${contentContext}

Return ONLY valid JSON, no markdown:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]

Rules: 4 options, correctIndex 0-3, practical questions relevant to the lesson topic.`

      let text = (await generateWithRetry([{ text: prompt }])).trim()
      text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
      const questions = JSON.parse(text) as { question: string; options: string[]; correctIndex: number; explanation: string }[]

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) continue
        await db.insert(lmsQuizQuestions).values({
          courseId, lessonId: lesson.id,
          question: q.question, options: q.options,
          correctIndex: q.correctIndex, explanation: q.explanation || null,
          orderIndex: i,
        })
        quizGenerated++
      }
    } catch (e) {
      console.error('Quiz generation after import failed:', e)
    }
  }

  return NextResponse.json({ lesson, quizGenerated })
}
