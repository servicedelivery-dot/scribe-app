import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons, lmsEnrollments, lmsProgress } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id))
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const modules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, id)).orderBy(asc(lmsModules.orderIndex))
  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, id)).orderBy(asc(lmsLessons.orderIndex))
  const [enrollment] = await db.select().from(lmsEnrollments).where(and(eq(lmsEnrollments.courseId, id), eq(lmsEnrollments.userId, userId)))
  const progress = await db.select().from(lmsProgress).where(and(eq(lmsProgress.courseId, id), eq(lmsProgress.userId, userId)))

  const completedIds = new Set(progress.map(p => p.lessonId))
  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id).map(l => ({ ...l, completed: completedIds.has(l.id) })),
  }))

  return NextResponse.json({ course, modules: modulesWithLessons, enrolled: !!enrollment, completedCount: completedIds.size, totalLessons: lessons.length })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const [course] = await db.update(lmsCourses).set({ ...body, updatedAt: new Date() }).where(and(eq(lmsCourses.id, id), eq(lmsCourses.createdBy, userId))).returning()
  return NextResponse.json(course)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(lmsCourses).where(and(eq(lmsCourses.id, id), eq(lmsCourses.createdBy, userId)))
  return NextResponse.json({ success: true })
}
