import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsLearningPaths, lmsLearningPathCourses, lmsCourses } from '@/lib/db/schema'
import { eq, asc, inArray } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const paths = await db.select().from(lmsLearningPaths).orderBy(asc(lmsLearningPaths.orderIndex))

  const pathsWithCourses = await Promise.all(paths.map(async p => {
    const pcRows = await db
      .select()
      .from(lmsLearningPathCourses)
      .where(eq(lmsLearningPathCourses.pathId, p.id))
      .orderBy(asc(lmsLearningPathCourses.orderIndex))

    const courseIds = pcRows.map(r => r.courseId)
    const courses = courseIds.length > 0
      ? await db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji, published: lmsCourses.published })
          .from(lmsCourses).where(inArray(lmsCourses.id, courseIds))
      : []

    return { ...p, courses: pcRows.map(r => courses.find(c => c.id === r.courseId)).filter(Boolean) }
  }))

  return NextResponse.json(pathsWithCourses)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [role] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(role?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, emoji, courseIds } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const [path] = await db.insert(lmsLearningPaths).values({
    title: title.trim(),
    description: description || null,
    emoji: emoji || '🛤️',
    createdBy: userId,
  }).returning()

  if (Array.isArray(courseIds) && courseIds.length > 0) {
    await db.insert(lmsLearningPathCourses).values(
      courseIds.map((courseId: string, i: number) => ({ pathId: path.id, courseId, orderIndex: i }))
    )
  }

  return NextResponse.json(path, { status: 201 })
}
