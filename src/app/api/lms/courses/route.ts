import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsEnrollments, lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, desc, count, and } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const courses = await db.select().from(lmsCourses).orderBy(desc(lmsCourses.createdAt))

  // Attach lesson counts and enrollment status per course
  const enriched = await Promise.all(courses.map(async (c) => {
    const [lessonCount] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, c.id))
    const [enrollment] = await db.select().from(lmsEnrollments)
      .where(and(eq(lmsEnrollments.courseId, c.id), eq(lmsEnrollments.userId, userId)))
    return { ...c, lessonCount: lessonCount.count, enrolled: !!enrollment }
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, emoji } = await req.json()
  const [course] = await db.insert(lmsCourses).values({
    createdBy: userId, title, description, emoji: emoji || '📚',
  }).returning()
  return NextResponse.json(course)
}
