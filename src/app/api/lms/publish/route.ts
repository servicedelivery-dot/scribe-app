import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons, generatedContent } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

function parseMarkdownToCourse(markdown: string) {
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean)
  const modules: { title: string; lessons: { title: string; content: string }[] }[] = []
  let currentModule: typeof modules[0] | null = null
  let currentLesson: { title: string; contentLines: string[] } | null = null

  function flushLesson() {
    if (currentLesson && currentModule) {
      currentModule.lessons.push({ title: currentLesson.title, content: currentLesson.contentLines.join('\n') })
      currentLesson = null
    }
  }

  function flushModule() {
    flushLesson()
    if (currentModule) modules.push(currentModule)
    currentModule = null
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushModule()
      currentModule = { title: line.replace(/^##\s+/, ''), lessons: [] }
    } else if (line.startsWith('### ') && currentModule) {
      flushLesson()
      currentLesson = { title: line.replace(/^###\s+/, ''), contentLines: [] }
    } else if (currentLesson) {
      currentLesson.contentLines.push(line)
    }
  }
  flushModule()

  return modules
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { generatedId, emoji } = await req.json()

  const [gen] = await db.select().from(generatedContent).where(eq(generatedContent.id, generatedId))
  if (!gen) return NextResponse.json({ error: 'Generated content not found' }, { status: 404 })

  // Create the course
  const [course] = await db.insert(lmsCourses).values({
    createdBy: userId,
    title: gen.title,
    description: `Auto-published from Content Creator — ${gen.format}`,
    emoji: emoji || '📚',
    published: true,
    sourceGeneratedId: generatedId,
  }).returning()

  // Parse markdown into modules + lessons
  const parsedModules = parseMarkdownToCourse(gen.body)

  if (parsedModules.length === 0) {
    // Fallback: create one module with the whole content as one lesson
    const [mod] = await db.insert(lmsModules).values({ courseId: course.id, title: 'Content', orderIndex: 0 }).returning()
    await db.insert(lmsLessons).values({ moduleId: mod.id, courseId: course.id, title: gen.title, content: gen.body, orderIndex: 0 })
  } else {
    for (let mi = 0; mi < parsedModules.length; mi++) {
      const m = parsedModules[mi]
      const [mod] = await db.insert(lmsModules).values({ courseId: course.id, title: m.title, orderIndex: mi }).returning()
      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li]
        await db.insert(lmsLessons).values({ moduleId: mod.id, courseId: course.id, title: l.title, content: l.content, orderIndex: li })
      }
    }
  }

  return NextResponse.json({ courseId: course.id })
}
