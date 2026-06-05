import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsLearningPaths, lmsLearningPathCourses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function requireEditor(userId: string) {
  const [row] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  return ['owner', 'admin', 'manager'].includes(row?.role ?? '')
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId || !(await requireEditor(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, emoji, published, courseIds } = body

  const [updated] = await db
    .update(lmsLearningPaths)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(emoji !== undefined && { emoji }),
      ...(published !== undefined && { published }),
    })
    .where(eq(lmsLearningPaths.id, id))
    .returning()

  if (Array.isArray(courseIds)) {
    await db.delete(lmsLearningPathCourses).where(eq(lmsLearningPathCourses.pathId, id))
    if (courseIds.length > 0) {
      await db.insert(lmsLearningPathCourses).values(
        courseIds.map((courseId: string, i: number) => ({ pathId: id, courseId, orderIndex: i }))
      )
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId || !(await requireEditor(userId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.delete(lmsLearningPaths).where(eq(lmsLearningPaths.id, id))
  return NextResponse.json({ ok: true })
}
