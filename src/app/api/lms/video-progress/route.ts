import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsVideoProgress } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, courseId, watchedSeconds, totalSeconds, lastPosition, completed } = await req.json()

  const existing = await db.select().from(lmsVideoProgress)
    .where(and(eq(lmsVideoProgress.userId, userId), eq(lmsVideoProgress.lessonId, lessonId)))

  if (existing.length) {
    await db.update(lmsVideoProgress).set({
      watchedSeconds: Math.max(existing[0].watchedSeconds, watchedSeconds),
      totalSeconds,
      lastPosition,
      completed: existing[0].completed || completed,
      updatedAt: new Date(),
    }).where(and(eq(lmsVideoProgress.userId, userId), eq(lmsVideoProgress.lessonId, lessonId)))
  } else {
    await db.insert(lmsVideoProgress).values({ userId, lessonId, courseId, watchedSeconds, totalSeconds, lastPosition, completed })
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const all = searchParams.get('all') === '1'

  if (all && courseId) {
    // Admin: all users progress for a course
    const rows = await db.select().from(lmsVideoProgress).where(eq(lmsVideoProgress.courseId, courseId))
    return NextResponse.json(rows)
  }

  if (courseId) {
    const rows = await db.select().from(lmsVideoProgress)
      .where(and(eq(lmsVideoProgress.userId, userId), eq(lmsVideoProgress.courseId, courseId)))
    return NextResponse.json(rows)
  }

  return NextResponse.json([])
}
