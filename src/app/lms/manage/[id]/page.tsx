import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, asc, and } from 'drizzle-orm'
import CourseEditor from '@/components/lms/CourseEditor'

export const dynamic = 'force-dynamic'

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()

  const [course] = await db.select().from(lmsCourses).where(and(eq(lmsCourses.id, id), eq(lmsCourses.createdBy, userId!)))
  if (!course) notFound()

  const modules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, id)).orderBy(asc(lmsModules.orderIndex))
  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, id)).orderBy(asc(lmsLessons.orderIndex))

  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id),
  }))

  return <CourseEditor course={course} initialModules={modulesWithLessons} />
}
