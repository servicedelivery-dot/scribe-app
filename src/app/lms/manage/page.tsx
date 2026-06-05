import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsCourses, lmsLessons, lmsEnrollments, lmsUserRoles } from '@/lib/db/schema'
import { eq, count, desc } from 'drizzle-orm'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import NewCourseButton from '@/components/lms/NewCourseButton'
import CourseList from '@/components/lms/CourseList'

export const dynamic = 'force-dynamic'

export default async function ManagePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(userRole?.role ?? '')) redirect('/lms')

  const courses = await db.select().from(lmsCourses).where(eq(lmsCourses.createdBy, userId!)).orderBy(desc(lmsCourses.createdAt))

  const enriched = await Promise.all(courses.map(async (c) => {
    const [lc] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, c.id))
    const [ec] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.courseId, c.id))
    return { ...c, lessonCount: lc.count, enrollCount: ec.count }
  }))

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Courses</h1>
          <p className="text-gray-400 mt-1">Create and manage your LMS courses</p>
        </div>
        <div className="flex gap-3">
          <Link href="/lms" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors">
            View Academy
          </Link>
          <NewCourseButton />
        </div>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-24">
          <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No courses yet</p>
          <p className="text-gray-600 text-sm mt-1">Create one manually or publish from Content Creator</p>
        </div>
      ) : (
        <CourseList courses={enriched} />
      )}
    </div>
  )
}
