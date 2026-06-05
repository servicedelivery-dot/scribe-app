import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsLearningPaths, lmsLearningPathCourses, lmsCourses } from '@/lib/db/schema'
import { eq, asc, inArray } from 'drizzle-orm'
import LearningPathsManager from '@/components/lms/LearningPathsManager'

export const dynamic = 'force-dynamic'

export default async function PathsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = userRole?.role ?? 'learner'
  const canEdit = ['owner', 'admin', 'manager'].includes(role)

  const paths = await db.select().from(lmsLearningPaths).orderBy(asc(lmsLearningPaths.orderIndex))

  const pathsWithCourses = await Promise.all(paths.map(async p => {
    const pcRows = await db
      .select()
      .from(lmsLearningPathCourses)
      .where(eq(lmsLearningPathCourses.pathId, p.id))
      .orderBy(asc(lmsLearningPathCourses.orderIndex))

    const courseIds = pcRows.map(r => r.courseId)
    const courses = courseIds.length > 0
      ? await db
          .select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji, published: lmsCourses.published })
          .from(lmsCourses)
          .where(inArray(lmsCourses.id, courseIds))
      : []

    return {
      ...p,
      createdAt: p.createdAt.toISOString(),
      courses: pcRows.map(r => courses.find(c => c.id === r.courseId) ?? null).filter(Boolean) as typeof courses,
    }
  }))

  // Only show published paths to learners
  const visiblePaths = canEdit ? pathsWithCourses : pathsWithCourses.filter(p => p.published)

  const allCourses = canEdit
    ? await db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji, published: lmsCourses.published })
        .from(lmsCourses).orderBy(asc(lmsCourses.createdAt))
    : []

  return <LearningPathsManager initialPaths={visiblePaths} allCourses={allCourses} canEdit={canEdit} />
}
