import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import {
  lmsUserRoles, lmsCourses, lmsEnrollments, lmsProgress,
  lmsCertificates, lmsQuizAttempts, lmsLessons,
} from '@/lib/db/schema'
import { eq, count, gte, desc, and, sql } from 'drizzle-orm'
import PlatformOverview from '@/components/lms/PlatformOverview'

export const dynamic = 'force-dynamic'

export default async function PlatformPage() {
  const { userId } = await auth()
  if (!userId) redirect('/lms')

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  if (!['owner', 'admin'].includes(role)) redirect('/lms')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsersRes,
    totalCoursesRes,
    publishedCoursesRes,
    totalEnrollmentsRes,
    totalCertsRes,
    totalAttemptsRes,
    passedAttemptsRes,
    activeUsersRes,
    totalLessonsCompletedRes,
    topCourseEnrollments,
    recentEnrollments,
    allCourses,
    allLessons,
  ] = await Promise.all([
    db.select({ count: count() }).from(lmsUserRoles),
    db.select({ count: count() }).from(lmsCourses),
    db.select({ count: count() }).from(lmsCourses).where(eq(lmsCourses.published, true)),
    db.select({ count: count() }).from(lmsEnrollments),
    db.select({ count: count() }).from(lmsCertificates),
    db.select({ count: count() }).from(lmsQuizAttempts),
    db.select({ count: count() }).from(lmsQuizAttempts).where(eq(lmsQuizAttempts.passed, true)),
    db.select({ count: count() }).from(lmsEnrollments).where(gte(lmsEnrollments.enrolledAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(lmsProgress),
    // top 5 by enrollment count
    db
      .select({ courseId: lmsEnrollments.courseId, enrollCount: count() })
      .from(lmsEnrollments)
      .groupBy(lmsEnrollments.courseId)
      .orderBy(desc(count()))
      .limit(5),
    // recent enrollments
    db
      .select({
        userId: lmsEnrollments.userId,
        courseId: lmsEnrollments.courseId,
        enrolledAt: lmsEnrollments.enrolledAt,
      })
      .from(lmsEnrollments)
      .orderBy(desc(lmsEnrollments.enrolledAt))
      .limit(10),
    db.select().from(lmsCourses),
    db.select({ courseId: lmsLessons.courseId, id: lmsLessons.id }).from(lmsLessons),
  ])

  const totalUsers = totalUsersRes[0].count
  const totalCourses = totalCoursesRes[0].count
  const publishedCourses = publishedCoursesRes[0].count
  const totalEnrollments = totalEnrollmentsRes[0].count
  const totalCerts = totalCertsRes[0].count
  const totalAttempts = totalAttemptsRes[0].count
  const passedAttempts = passedAttemptsRes[0].count
  const activeUsers = activeUsersRes[0].count
  const totalLessonsCompleted = totalLessonsCompletedRes[0].count

  const quizPassRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0

  // avg completion % across all enrolled users
  const progressRows = await db.select({ userId: lmsProgress.userId, courseId: lmsProgress.courseId }).from(lmsProgress)
  const enrollmentRows = await db.select({ userId: lmsEnrollments.userId, courseId: lmsEnrollments.courseId }).from(lmsEnrollments)

  const lessonCountByCourse: Record<string, number> = {}
  for (const l of allLessons) lessonCountByCourse[l.courseId] = (lessonCountByCourse[l.courseId] ?? 0) + 1

  const progressByUserCourse: Record<string, number> = {}
  for (const p of progressRows) {
    const key = `${p.userId}::${p.courseId}`
    progressByUserCourse[key] = (progressByUserCourse[key] ?? 0) + 1
  }

  let totalPct = 0
  let pctCount = 0
  for (const e of enrollmentRows) {
    const total = lessonCountByCourse[e.courseId] ?? 0
    if (total === 0) continue
    const done = progressByUserCourse[`${e.userId}::${e.courseId}`] ?? 0
    totalPct += Math.round((done / total) * 100)
    pctCount++
  }
  const avgCompletionPct = pctCount > 0 ? Math.round(totalPct / pctCount) : 0

  // Build top courses
  const courseMap = new Map(allCourses.map(c => [c.id, c]))
  const completionByCourse = await db
    .select({ courseId: lmsCertificates.courseId, completions: count() })
    .from(lmsCertificates)
    .groupBy(lmsCertificates.courseId)
  const completionMap = new Map(completionByCourse.map(r => [r.courseId, r.completions]))

  const quizByCourse = await db
    .select({ courseId: lmsQuizAttempts.courseId, total: count(), passed: sql<number>`sum(case when passed then 1 else 0 end)` })
    .from(lmsQuizAttempts)
    .groupBy(lmsQuizAttempts.courseId)
  const quizMap = new Map(quizByCourse.map(r => [r.courseId, r]))

  const topCourses = topCourseEnrollments.map((row, i) => {
    const course = courseMap.get(row.courseId)
    const comps = completionMap.get(row.courseId) ?? 0
    const qz = quizMap.get(row.courseId)
    const pr = qz && qz.total > 0 ? Math.round((Number(qz.passed) / qz.total) * 100) : null
    return {
      rank: i + 1,
      courseId: row.courseId,
      title: course?.title ?? 'Unknown',
      emoji: course?.emoji ?? '📚',
      enrollments: row.enrollCount,
      completions: comps,
      passRate: pr,
    }
  })

  // Enrich recent enrollments with user names
  const userIds = [...new Set(recentEnrollments.map(e => e.userId))]
  const userRows = userIds.length > 0
    ? await db.select({ userId: lmsUserRoles.userId, displayName: lmsUserRoles.displayName, email: lmsUserRoles.email })
        .from(lmsUserRoles)
        .where(sql`${lmsUserRoles.userId} = ANY(${sql.raw(`ARRAY[${userIds.map(id => `'${id}'`).join(',')}]`)})`)
    : []
  const userMap = new Map(userRows.map(u => [u.userId, u]))

  const recentFeed = recentEnrollments.map(e => {
    const u = userMap.get(e.userId)
    const c = courseMap.get(e.courseId)
    return {
      userId: e.userId,
      userName: u?.displayName ?? u?.email ?? 'Unknown',
      courseTitle: c?.title ?? 'Unknown',
      enrolledAt: e.enrolledAt,
    }
  })

  return (
    <PlatformOverview
      totalUsers={totalUsers}
      publishedCourses={publishedCourses}
      totalCourses={totalCourses}
      totalEnrollments={totalEnrollments}
      totalCerts={totalCerts}
      quizPassRate={quizPassRate}
      activeUsers={activeUsers}
      avgCompletionPct={avgCompletionPct}
      totalLessonsCompleted={totalLessonsCompleted}
      topCourses={topCourses}
      recentFeed={recentFeed}
    />
  )
}
