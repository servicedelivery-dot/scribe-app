import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses, lmsEnrollments, lmsProgress, lmsLessons, lmsCertificates, lmsQuizAttempts } from '@/lib/db/schema'
import { count, eq, desc, gte, sql } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    [totalCourses],
    [totalEnrollments],
    [totalCompletions],
    [totalCertificates],
    recentEnrollments,
    topCourses,
    recentActivity,
  ] = await Promise.all([
    db.select({ count: count() }).from(lmsCourses).where(eq(lmsCourses.published, true)),
    db.select({ count: count() }).from(lmsEnrollments),
    db.select({ count: count() }).from(lmsCertificates),
    db.select({ count: count() }).from(lmsCertificates),

    // Enrollments per day last 30 days
    db.select({
      day: sql<string>`${lmsEnrollments.enrolledAt}::date`,
      count: count(),
    }).from(lmsEnrollments)
      .where(gte(lmsEnrollments.enrolledAt, thirtyDaysAgo))
      .groupBy(sql`${lmsEnrollments.enrolledAt}::date`)
      .orderBy(sql`${lmsEnrollments.enrolledAt}::date`),

    // Top courses by enrollment
    db.select({
      courseId: lmsEnrollments.courseId,
      enrollCount: count(),
    }).from(lmsEnrollments)
      .groupBy(lmsEnrollments.courseId)
      .orderBy(desc(count()))
      .limit(5),

    // Recent progress events
    db.select().from(lmsProgress)
      .orderBy(desc(lmsProgress.completedAt))
      .limit(20),
  ])

  // Enrich top courses with titles
  const enrichedTop = await Promise.all(topCourses.map(async t => {
    const [course] = await db.select({ title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).where(eq(lmsCourses.id, t.courseId))
    const [lessonCount] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, t.courseId))
    const [complCount] = await db.select({ count: count() }).from(lmsCertificates).where(eq(lmsCertificates.courseId, t.courseId))
    return { ...t, title: course?.title ?? 'Unknown', emoji: course?.emoji ?? '📚', lessonCount: lessonCount.count, completions: complCount.count }
  }))

  // Overall completion rate
  const completionRate = totalEnrollments.count > 0
    ? Math.round((totalCompletions.count / totalEnrollments.count) * 100)
    : 0

  // Quiz pass rate
  const [quizStats] = await db.select({
    total: count(),
    passed: sql<number>`SUM(CASE WHEN ${lmsQuizAttempts.passed} THEN 1 ELSE 0 END)`,
  }).from(lmsQuizAttempts)

  return NextResponse.json({
    kpis: {
      totalCourses: totalCourses.count,
      totalEnrollments: totalEnrollments.count,
      totalCompletions: totalCompletions.count,
      totalCertificates: totalCertificates.count,
      completionRate,
      quizPassRate: quizStats.total > 0 ? Math.round((Number(quizStats.passed) / quizStats.total) * 100) : 0,
    },
    enrollmentsByDay: recentEnrollments,
    topCourses: enrichedTop,
    recentActivity,
  })
}
