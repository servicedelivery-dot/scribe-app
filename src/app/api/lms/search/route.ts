import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsLessons, lmsUserRoles, lmsAnnouncements } from '@/lib/db/schema'
import { ilike, or } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) {
    return NextResponse.json({ courses: [], lessons: [], users: [], announcements: [] })
  }

  const pattern = `%${q}%`

  const [courses, lessons, users, announcements] = await Promise.all([
    db
      .select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses)
      .where(or(ilike(lmsCourses.title, pattern), ilike(lmsCourses.description, pattern)))
      .limit(5),

    db
      .select({ id: lmsLessons.id, courseId: lmsLessons.courseId, title: lmsLessons.title })
      .from(lmsLessons)
      .where(ilike(lmsLessons.title, pattern))
      .limit(5),

    db
      .select({
        userId: lmsUserRoles.userId,
        displayName: lmsUserRoles.displayName,
        email: lmsUserRoles.email,
        role: lmsUserRoles.role,
      })
      .from(lmsUserRoles)
      .where(or(ilike(lmsUserRoles.displayName, pattern), ilike(lmsUserRoles.email, pattern)))
      .limit(5),

    db
      .select({ id: lmsAnnouncements.id, title: lmsAnnouncements.title })
      .from(lmsAnnouncements)
      .where(ilike(lmsAnnouncements.title, pattern))
      .limit(5),
  ])

  return NextResponse.json({
    courses: courses.map((c) => ({ ...c, type: 'course' as const })),
    lessons: lessons.map((l) => ({ ...l, type: 'lesson' as const })),
    users: users.map((u) => ({ ...u, type: 'user' as const })),
    announcements: announcements.map((a) => ({ ...a, type: 'announcement' as const })),
  })
}
