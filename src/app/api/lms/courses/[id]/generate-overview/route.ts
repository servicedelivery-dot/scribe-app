import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsLessons, lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  if (!['owner', 'admin', 'manager'].includes(role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, id))

  const lessonSummaries = lessons.map((l, i) => {
    let contentText = ''
    try {
      const parsed = JSON.parse(l.content)
      if (parsed.__scribe && Array.isArray(parsed.steps)) {
        contentText = parsed.steps
          .slice(0, 8)
          .map((s: { text?: string; title?: string }) => s.text || s.title || '')
          .filter(Boolean)
          .join(' | ')
      } else if (parsed.__video) {
        contentText = '[video lesson]'
      } else if (parsed.__pdf) {
        contentText = '[PDF lesson]'
      }
    } catch {
      contentText = l.content?.slice(0, 300) || ''
    }
    return `Lesson ${i + 1}: "${l.title}"${contentText ? ` — ${contentText}` : ''}`
  }).join('\n')

  const prompt = `You are creating a course overview for Airportr Academy — a training platform for airport baggage handling and logistics staff at major European airports (Heathrow, Frankfurt, Vienna, etc.).

Course: "${course.title}"
${course.description ? `Description: ${course.description}` : ''}

${lessonSummaries ? `Lessons:\n${lessonSummaries}` : ''}

Generate a concise course overview for operational staff. Keep it practical and focused on what they will DO.

Return ONLY valid JSON — no markdown:
{
  "summary": "One sentence, max 20 words, what staff will be able to do after this course",
  "points": ["up to 7 short action-oriented steps or key skills, each max 10 words"]
}

Rules:
- Each point starts with a strong verb (Check, Handle, Complete, Verify, Report, etc.)
- Points must be specific to the course content, not generic
- No bullet symbols in strings
- If content is thin, infer from the course title in the context of airport baggage operations`

  try {
    let text = (await generateWithRetry([{ text: prompt }])).trim()
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
    const overview = JSON.parse(text) as { summary: string; points: string[] }

    if (!overview.summary || !Array.isArray(overview.points))
      throw new Error('Invalid response shape')

    const aiOverview = JSON.stringify({ ...overview, generatedAt: new Date().toISOString() })
    await db.update(lmsCourses).set({ aiOverview }).where(eq(lmsCourses.id, id))

    return NextResponse.json(overview)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 })
  }
}
