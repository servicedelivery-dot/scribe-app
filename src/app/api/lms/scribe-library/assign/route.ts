import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsScribeLibrary, lmsCourses, lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scribeIds, courseId }: { scribeIds: string[]; courseId: string } = await req.json()
  if (!scribeIds?.length || !courseId) return NextResponse.json({ error: 'scribeIds and courseId required' }, { status: 400 })

  // Verify course exists
  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Get or create a "Scribe Guides" module in this course
  const existingModules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, courseId))
  let moduleId: string

  const scribeModule = existingModules.find(m => m.title === 'Scribe Guides')
  if (scribeModule) {
    moduleId = scribeModule.id
  } else {
    const [newModule] = await db.insert(lmsModules).values({
      courseId,
      title: 'Scribe Guides',
      orderIndex: existingModules.length,
    }).returning()
    moduleId = newModule.id
  }

  // Get existing lessons in this module to determine next orderIndex
  const existingLessons = await db.select().from(lmsLessons).where(eq(lmsLessons.moduleId, moduleId))
  let nextOrder = existingLessons.length

  // Fetch the scribe items
  const items = await db.select().from(lmsScribeLibrary).where(inArray(lmsScribeLibrary.id, scribeIds))

  // Insert lessons
  const inserted = []
  for (const item of items) {
    const content = JSON.stringify({
      __scribe: true,
      slides: item.slidesUrl,
      movie: item.movieUrl,
      scroll: item.scrollUrl,
    })
    const [lesson] = await db.insert(lmsLessons).values({
      moduleId,
      courseId,
      title: item.title,
      content,
      lessonType: 'scribe',
      orderIndex: nextOrder++,
    }).returning()
    inserted.push(lesson)
  }

  return NextResponse.json({ added: inserted.length, moduleId, courseName: course.title })
}
