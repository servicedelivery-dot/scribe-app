import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsVideoProgress, lmsUserRoles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/lms/video-progress/metrics?lessonId=xxx
// Returns per-user watch metrics for a specific video lesson
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lessonId = searchParams.get('lessonId')
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const rows = await db.select({
    userId: lmsVideoProgress.userId,
    watchedSeconds: lmsVideoProgress.watchedSeconds,
    totalSeconds: lmsVideoProgress.totalSeconds,
    lastPosition: lmsVideoProgress.lastPosition,
    completed: lmsVideoProgress.completed,
    updatedAt: lmsVideoProgress.updatedAt,
    displayName: lmsUserRoles.displayName,
    email: lmsUserRoles.email,
  })
    .from(lmsVideoProgress)
    .leftJoin(lmsUserRoles, eq(lmsVideoProgress.userId, lmsUserRoles.userId))
    .where(eq(lmsVideoProgress.lessonId, lessonId))

  const metrics = rows.map(r => ({
    userId: r.userId,
    name: r.displayName ?? r.email ?? r.userId,
    email: r.email ?? '',
    watchedSeconds: r.watchedSeconds,
    totalSeconds: r.totalSeconds,
    lastPosition: r.lastPosition,
    pct: r.totalSeconds > 0 ? Math.round((r.watchedSeconds / r.totalSeconds) * 100) : 0,
    completed: r.completed,
    lastSeen: r.updatedAt,
  }))

  return NextResponse.json(metrics)
}
