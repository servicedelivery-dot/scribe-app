import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const modules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, courseId)).orderBy(asc(lmsModules.orderIndex))
  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, courseId)).orderBy(asc(lmsLessons.orderIndex))

  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id),
  }))

  return NextResponse.json(modulesWithLessons)
}
