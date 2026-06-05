import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import {
  lmsUserRoles, lmsCourses, lmsCourseFeedback,
} from '@/lib/db/schema'
import { eq, desc, avg, count } from 'drizzle-orm'
import FeedbackDashboard from '@/components/lms/FeedbackDashboard'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  if (role === 'learner') redirect('/lms')

  // All published courses
  const allCourses = await db.select().from(lmsCourses).where(eq(lmsCourses.published, true))

  // All feedback rows with user display names
  const feedbackRows = await db
    .select()
    .from(lmsCourseFeedback)
    .orderBy(desc(lmsCourseFeedback.createdAt))

  // Build display name map
  const uniqueUserIds = [...new Set(feedbackRows.map(r => r.userId))]
  const userRoles = uniqueUserIds.length > 0
    ? await db.select({ userId: lmsUserRoles.userId, displayName: lmsUserRoles.displayName, email: lmsUserRoles.email })
        .from(lmsUserRoles)
    : []
  const nameMap = new Map(userRoles.map(u => [u.userId, u.displayName ?? u.email ?? 'Learner']))

  // Group by course
  const courseMap = new Map(allCourses.map(c => [c.id, c]))
  const groupedMap = new Map<string, typeof feedbackRows>()
  for (const row of feedbackRows) {
    const existing = groupedMap.get(row.courseId) ?? []
    existing.push(row)
    groupedMap.set(row.courseId, existing)
  }

  const courses = [...groupedMap.entries()]
    .map(([courseId, rows]) => {
      const course = courseMap.get(courseId)
      if (!course) return null
      const avgRating = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length
      return {
        courseId,
        courseTitle: course.title,
        courseEmoji: course.emoji,
        avgRating: Math.round(avgRating * 10) / 10,
        count: rows.length,
        feedback: rows.map(r => ({
          id: r.id,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment,
          displayName: nameMap.get(r.userId) ?? 'Learner',
          createdAt: r.createdAt.toISOString(),
        })),
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return <FeedbackDashboard courses={courses} />
}
