import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseFeedback, lmsUserRoles } from '@/lib/db/schema'
import { eq, avg, count, desc, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const [aggRow] = await db
    .select({ avgRating: avg(lmsCourseFeedback.rating), count: count() })
    .from(lmsCourseFeedback)
    .where(eq(lmsCourseFeedback.courseId, courseId))

  const feedbackRows = await db
    .select()
    .from(lmsCourseFeedback)
    .where(eq(lmsCourseFeedback.courseId, courseId))
    .orderBy(desc(lmsCourseFeedback.createdAt))
    .limit(50)

  const enriched = await Promise.all(
    feedbackRows.map(async (row) => {
      const [userRole] = await db
        .select({ displayName: lmsUserRoles.displayName })
        .from(lmsUserRoles)
        .where(eq(lmsUserRoles.userId, row.userId))
      return {
        ...row,
        displayName: userRole?.displayName ?? 'Learner',
        createdAt: row.createdAt.toISOString(),
      }
    })
  )

  return NextResponse.json({
    avgRating: aggRow?.avgRating ? Number(Number(aggRow.avgRating).toFixed(1)) : 0,
    count: aggRow?.count ?? 0,
    feedback: enriched,
  })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, rating, comment } = await req.json()
  if (!courseId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'courseId and rating (1-5) required' }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(lmsCourseFeedback)
    .where(and(eq(lmsCourseFeedback.userId, userId), eq(lmsCourseFeedback.courseId, courseId)))

  if (existing) {
    await db
      .update(lmsCourseFeedback)
      .set({ rating, comment: comment ?? null })
      .where(eq(lmsCourseFeedback.id, existing.id))
  } else {
    await db.insert(lmsCourseFeedback).values({
      courseId,
      userId,
      rating,
      comment: comment ?? null,
    })
  }

  return NextResponse.json({ success: true })
}
