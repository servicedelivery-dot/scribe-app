import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import {
  lmsUserRoles, lmsCourses, lmsEnrollments, lmsProgress,
  lmsCertificates, lmsQuizAttempts, lmsLessons, lmsUserGroups,
  lmsCourseAssignments,
} from '@/lib/db/schema'
import { eq, desc, inArray, sql } from 'drizzle-orm'
import TeamDashboard from '@/components/lms/TeamDashboard'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const { userId } = await auth()
  if (!userId) redirect('/lms')

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  if (role === 'learner') redirect('/lms')

  // Determine which users to show
  let managedUserIds: string[] | null = null // null = all users

  if (role === 'manager') {
    // find groups the manager belongs to
    const myGroupRows = await db
      .select({ groupId: lmsUserGroups.groupId })
      .from(lmsUserGroups)
      .where(eq(lmsUserGroups.userId, userId))
    const myGroupIds = myGroupRows.map(r => r.groupId)

    if (myGroupIds.length > 0) {
      const memberRows = await db
        .select({ userId: lmsUserGroups.userId })
        .from(lmsUserGroups)
        .where(inArray(lmsUserGroups.groupId, myGroupIds))
      managedUserIds = [...new Set(memberRows.map(r => r.userId).filter(id => id !== userId))]
    } else {
      managedUserIds = []
    }
  }

  // Fetch all user roles (filtered if manager)
  let userRolesQuery = db.select().from(lmsUserRoles)
  const allUserRoles = managedUserIds === null
    ? await userRolesQuery
    : managedUserIds.length > 0
      ? await db.select().from(lmsUserRoles).where(inArray(lmsUserRoles.userId, managedUserIds))
      : []

  const userIds = allUserRoles.map(u => u.userId)

  if (userIds.length === 0) {
    const allCourses = await db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).where(eq(lmsCourses.published, true))
    return <TeamDashboard members={[]} courses={allCourses} />
  }

  // Parallel fetch
  const [
    allEnrollments,
    allProgress,
    allCerts,
    allAttempts,
    allAssignments,
    allLessons,
    allCourses,
  ] = await Promise.all([
    db.select().from(lmsEnrollments).where(inArray(lmsEnrollments.userId, userIds)),
    db.select({ userId: lmsProgress.userId, courseId: lmsProgress.courseId, completedAt: lmsProgress.completedAt })
      .from(lmsProgress).where(inArray(lmsProgress.userId, userIds)),
    db.select({ userId: lmsCertificates.userId, courseId: lmsCertificates.courseId })
      .from(lmsCertificates).where(inArray(lmsCertificates.userId, userIds)),
    db.select({ userId: lmsQuizAttempts.userId, courseId: lmsQuizAttempts.courseId, passed: lmsQuizAttempts.passed, score: lmsQuizAttempts.score })
      .from(lmsQuizAttempts).where(inArray(lmsQuizAttempts.userId, userIds)),
    db.select().from(lmsCourseAssignments).where(inArray(lmsCourseAssignments.userId, userIds)),
    db.select({ id: lmsLessons.id, courseId: lmsLessons.courseId }).from(lmsLessons),
    db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).where(eq(lmsCourses.published, true)),
  ])

  const lessonCountByCourse: Record<string, number> = {}
  for (const l of allLessons) lessonCountByCourse[l.courseId] = (lessonCountByCourse[l.courseId] ?? 0) + 1

  // Build per-user data
  const users = allUserRoles.map(u => {
    const enrollments = allEnrollments.filter(e => e.userId === u.userId)
    const progressRows = allProgress.filter(p => p.userId === u.userId)
    const certs = allCerts.filter(c => c.userId === u.userId)
    const attempts = allAttempts.filter(a => a.userId === u.userId)
    const assignments = allAssignments.filter(a => a.userId === u.userId)

    // Last activity = most recent progress or enrollment
    const progressDates = progressRows.map(p => new Date(p.completedAt).getTime())
    const enrollDates = enrollments.map(e => new Date(e.enrolledAt).getTime())
    const allDates = [...progressDates, ...enrollDates]
    const lastActive = allDates.length > 0 ? new Date(Math.max(...allDates)) : null

    // Per-course breakdown
    const courses = enrollments.map(e => {
      const courseId = e.courseId
      const total = lessonCountByCourse[courseId] ?? 0
      const done = progressRows.filter(p => p.courseId === courseId).length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const cert = certs.find(c => c.courseId === courseId)
      const assignment = assignments.find(a => a.courseId === courseId)
      const course = allCourses.find(c => c.id === courseId)

      return {
        courseId,
        title: course?.title ?? 'Unknown',
        emoji: course?.emoji ?? '📚',
        done,
        total,
        pct,
        certified: !!cert,
        dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      }
    })

    return {
      userId: u.userId,
      name: u.displayName ?? u.email ?? u.userId,
      email: u.email ?? '',
      role: u.role,
      enrolled: enrollments.length,
      lessonsCompleted: progressRows.length,
      certificates: certs.length,
      lastActive: lastActive?.toISOString() ?? null,
      courses,
    }
  })

  return <TeamDashboard members={users} courses={allCourses} />
}
