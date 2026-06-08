import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AnalyticsDashboard from '@/components/lms/AnalyticsDashboard'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { db: dbCheck } = await import('@/lib/db')
  const { lmsUserRoles: roles } = await import('@/lib/db/schema')
  const { eq: eqCheck } = await import('drizzle-orm')
  const [requester] = await dbCheck.select().from(roles).where(eqCheck(roles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(requester?.role ?? '')) redirect('/lms')

  const { db } = await import('@/lib/db')
  const { lmsCourses, lmsEnrollments, lmsProgress, lmsLessons, lmsCertificates, lmsQuizAttempts } = await import('@/lib/db/schema')
  const { count, desc, gte, sql, eq } = await import('drizzle-orm')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [[tc], [te], [tcomp], [tcert], enrollByDay, topRaw] = await Promise.all([
    db.select({ count: count() }).from(lmsCourses).where(eq(lmsCourses.published, true)),
    db.select({ count: count() }).from(lmsEnrollments),
    db.select({ count: count() }).from(lmsCertificates),
    db.select({ count: count() }).from(lmsCertificates),
    db.select({ day: sql<string>`${lmsEnrollments.enrolledAt}::date`, cnt: count() })
      .from(lmsEnrollments).where(gte(lmsEnrollments.enrolledAt, thirtyDaysAgo))
      .groupBy(sql`${lmsEnrollments.enrolledAt}::date`).orderBy(sql`${lmsEnrollments.enrolledAt}::date`),
    db.select({ courseId: lmsEnrollments.courseId, enrollCount: count() })
      .from(lmsEnrollments).groupBy(lmsEnrollments.courseId).orderBy(desc(count())).limit(5),
  ])

  const topCourses = await Promise.all(topRaw.map(async t => {
    const [c] = await db.select({ title: lmsCourses.title, emoji: lmsCourses.emoji }).from(lmsCourses).where(eq(lmsCourses.id, t.courseId))
    const [lc] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, t.courseId))
    const [cc] = await db.select({ count: count() }).from(lmsCertificates).where(eq(lmsCertificates.courseId, t.courseId))
    return { courseId: t.courseId, enrollCount: t.enrollCount, title: c?.title ?? 'Unknown', emoji: c?.emoji ?? '📚', lessonCount: lc.count, completions: cc.count }
  }))

  const [qs] = await db.select({
    total: count(),
    passed: sql<number>`SUM(CASE WHEN ${lmsQuizAttempts.passed} THEN 1 ELSE 0 END)`,
  }).from(lmsQuizAttempts)

  const completionRate = te.count > 0 ? Math.round((tcomp.count / te.count) * 100) : 0
  const quizPassRate = qs.total > 0 ? Math.round((Number(qs.passed) / qs.total) * 100) : 0

  const data = {
    kpis: { totalCourses: tc.count, totalEnrollments: te.count, totalCompletions: tcomp.count, totalCertificates: tcert.count, completionRate, quizPassRate },
    enrollmentsByDay: enrollByDay.map(e => ({ day: e.day, count: e.cnt })),
    topCourses,
  }

  return <AnalyticsDashboard data={data} />
}
