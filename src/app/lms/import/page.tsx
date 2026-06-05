import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsCourses, lmsModules } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import ImportLesson from '@/components/lms/ImportLesson'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(userRole?.role ?? '')) redirect('/lms')

  const courses = await db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji })
    .from(lmsCourses).orderBy(asc(lmsCourses.title))

  const modules = await db.select({ id: lmsModules.id, title: lmsModules.title, courseId: lmsModules.courseId })
    .from(lmsModules).orderBy(asc(lmsModules.orderIndex))

  return <ImportLesson courses={courses} allModules={modules} />
}
