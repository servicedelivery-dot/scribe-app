import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseScreenshots, lmsCourses, lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const screenshots = await db
    .select()
    .from(lmsCourseScreenshots)
    .where(eq(lmsCourseScreenshots.courseId, courseId))
    .orderBy(asc(lmsCourseScreenshots.createdAt))

  if (screenshots.length === 0) {
    return NextResponse.json({ error: 'No screenshots uploaded yet' }, { status: 400 })
  }

  // Build the prompt with image URLs and context
  const screenshotDescriptions = screenshots
    .map((s, i) => `Photo ${i + 1}: ${s.context || '(no context provided)'}\nURL: ${s.imageUrl}`)
    .join('\n\n')

  const prompt = `You are a course content creator. Based on the following screenshots and their descriptions from a subject matter expert, generate a structured set of lessons for a course called "${course.title}".

Screenshots provided:
${screenshotDescriptions}

Create a JSON response with this exact structure:
{
  "modules": [
    {
      "title": "Module title",
      "lessons": [
        {
          "title": "Lesson title",
          "content": "Detailed lesson content in Markdown format based on what you can infer from the screenshot descriptions. Include key points, explanations, and any relevant steps or procedures mentioned."
        }
      ]
    }
  ]
}

Rules:
- Create 1-3 modules based on the natural groupings of the content
- Create 1-4 lessons per module
- Write lesson content in clear Markdown (headings, bullet points, steps where appropriate)
- Base content strictly on what the screenshots and context describe
- Return ONLY the JSON, no other text`

  let parsed: { modules: { title: string; lessons: { title: string; content: string }[] }[] }

  try {
    const raw = await generateWithRetry([{ text: prompt }])
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `AI generation failed: ${msg}` }, { status: 500 })
  }

  // Get current module count to set orderIndex
  const existingModules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, courseId))
  let moduleOrder = existingModules.length
  let totalCreated = 0

  for (const modData of parsed.modules) {
    const [mod] = await db
      .insert(lmsModules)
      .values({ courseId, title: modData.title, orderIndex: moduleOrder++ })
      .returning()

    let lessonOrder = 0
    for (const lessonData of modData.lessons) {
      await db.insert(lmsLessons).values({
        moduleId: mod.id,
        courseId,
        title: lessonData.title,
        content: lessonData.content,
        lessonType: 'markdown',
        orderIndex: lessonOrder++,
      })
      totalCreated++
    }
  }

  return NextResponse.json({ created: totalCreated, modules: parsed.modules.length })
}
