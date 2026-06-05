import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsSignoffs, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null

  const rows = status
    ? await db.select().from(lmsSignoffs).where(eq(lmsSignoffs.status, status)).orderBy(desc(lmsSignoffs.requestedAt))
    : await db.select().from(lmsSignoffs).orderBy(desc(lmsSignoffs.requestedAt))

  const enriched = await Promise.all(rows.map(async r => {
    const [course] = await db.select({ title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).where(eq(lmsCourses.id, r.courseId))
    const [userRole] = await db.select({ displayName: lmsUserRoles.displayName, email: lmsUserRoles.email })
      .from(lmsUserRoles).where(eq(lmsUserRoles.userId, r.userId))
    return {
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      courseTitle: course?.title ?? 'Unknown',
      courseEmoji: course?.emoji ?? '📚',
      userDisplayName: userRole?.displayName ?? r.userId,
      userEmail: userRole?.email ?? '',
    }
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, userId: targetUserId, notes } = await req.json()
  if (!courseId || !targetUserId) {
    return NextResponse.json({ error: 'courseId and userId are required' }, { status: 400 })
  }

  const [row] = await db.insert(lmsSignoffs).values({
    courseId,
    userId: targetUserId,
    requestedBy: userId,
    notes: notes ?? null,
    status: 'pending',
  }).returning()

  return NextResponse.json({ ...row, requestedAt: row.requestedAt.toISOString(), reviewedAt: null })
}
