import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsEnrollments, lmsLessons } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import Link from 'next/link'
import { BookOpen, Users, GraduationCap, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LmsPage() {
  const { userId } = await auth()

  const courses = await db.select().from(lmsCourses).where(eq(lmsCourses.published, true)).orderBy(desc(lmsCourses.createdAt))

  const enriched = await Promise.all(courses.map(async (c) => {
    const [lc] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, c.id))
    const [ec] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.courseId, c.id))
    const enrolled = userId ? await db.select().from(lmsEnrollments).where(and(eq(lmsEnrollments.courseId, c.id), eq(lmsEnrollments.userId, userId!))) : []
    return { ...c, lessonCount: lc.count, enrollCount: ec.count, enrolled: enrolled.length > 0 }
  }))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-violet-400" /> Academy
          </h1>
          <p className="text-gray-400 mt-1">Browse and enroll in courses</p>
        </div>
        <Link href="/lms/manage" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700">
          <Plus className="w-4 h-4" /> Manage Courses
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-24">
          <GraduationCap className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No courses published yet</p>
          <p className="text-gray-600 text-sm mt-1">Go to Content Creator, generate a course, then publish it to the Academy</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors">
            Open Content Creator
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {enriched.map(course => (
            <Link key={course.id} href={`/lms/course/${course.id}`} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-violet-500/40 transition-all group">
              <div className="h-28 bg-gradient-to-br from-violet-900/40 to-gray-900 flex items-center justify-center text-5xl">
                {course.emoji}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2 mb-1">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{course.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessonCount} lessons</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollCount} enrolled</span>
                </div>
                {course.enrolled && (
                  <span className="mt-3 inline-block text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-full">Enrolled</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
