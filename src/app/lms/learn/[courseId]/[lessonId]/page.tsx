import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons, lmsEnrollments, lmsProgress, lmsCourseAssignments } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import LessonViewer from '@/components/lms/LessonViewer'

export const dynamic = 'force-dynamic'

export default async function LearnPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [enrollment] = await db.select().from(lmsEnrollments).where(and(eq(lmsEnrollments.courseId, courseId), eq(lmsEnrollments.userId, userId)))
  if (!enrollment) redirect(`/lms/course/${courseId}`)

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!course) notFound()

  const modules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, courseId)).orderBy(asc(lmsModules.orderIndex))
  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, courseId)).orderBy(asc(lmsLessons.orderIndex))
  const [currentLesson] = await db.select().from(lmsLessons).where(eq(lmsLessons.id, lessonId))
  if (!currentLesson) notFound()

  const progress = await db.select().from(lmsProgress).where(and(eq(lmsProgress.courseId, courseId), eq(lmsProgress.userId, userId)))
  const completedIds = new Set(progress.map(p => p.lessonId))

  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id).map(l => ({ ...l, completed: completedIds.has(l.id) })),
  }))

  const currentIndex = lessons.findIndex(l => l.id === lessonId)
  const nextLesson = lessons[currentIndex + 1] ?? null
  const prevLesson = lessons[currentIndex - 1] ?? null

  const [assignment] = await db.select().from(lmsCourseAssignments)
    .where(and(eq(lmsCourseAssignments.userId, userId!), eq(lmsCourseAssignments.courseId, courseId)))
  const courseDueDate = assignment?.dueDate ? new Date(assignment.dueDate).toISOString() : null

  return (
    <LessonViewer
      course={{ ...course, passScoreRequired: course.passScoreRequired ?? 70 }}
      currentLesson={{ ...currentLesson, completed: completedIds.has(lessonId) }}
      modules={modulesWithLessons}
      nextLesson={nextLesson}
      prevLesson={prevLesson}
      completedCount={completedIds.size}
      totalLessons={lessons.length}
      isLastLesson={!nextLesson}
      courseDueDate={courseDueDate}
    />
  )
}
