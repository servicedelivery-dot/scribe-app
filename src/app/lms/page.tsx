import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import {
  lmsCourses, lmsEnrollments, lmsLessons, lmsProgress,
  lmsCourseAssignments, lmsCertificates,
  lmsUserGroups, lmsCourseGroups, lmsGroups, lmsUserRoles,
} from '@/lib/db/schema'
import { eq, and, count, desc, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { BookOpen, CheckCircle, Award, Clock, TrendingUp, Users, GraduationCap, Plus, AlertTriangle } from 'lucide-react'
import CourseEnrollButton from '@/components/lms/CourseEnrollButton'

export const dynamic = 'force-dynamic'

function fmt(d: Date | string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysLeft(d: Date | string | null) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export default async function LmsPage() {
  const { userId } = await auth()
  if (!userId) return null

  // Role
  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  const isAdmin = ['owner', 'admin', 'manager'].includes(role)

  // ── Which course IDs the learner can see based on groups ────────────────────
  let allowedCourseIds: string[] | null = null // null = all
  let myGroups: { id: string; name: string; color: string }[] = []

  if (!isAdmin) {
    const userGroupRows = await db
      .select({ groupId: lmsUserGroups.groupId })
      .from(lmsUserGroups)
      .where(eq(lmsUserGroups.userId, userId))

    if (userGroupRows.length > 0) {
      const groupIds = userGroupRows.map(r => r.groupId)

      // Group names for display
      myGroups = await db.select({ id: lmsGroups.id, name: lmsGroups.name, color: lmsGroups.color })
        .from(lmsGroups)
        .where(inArray(lmsGroups.id, groupIds))

      const cgRows = await db
        .select({ courseId: lmsCourseGroups.courseId })
        .from(lmsCourseGroups)
        .where(inArray(lmsCourseGroups.groupId, groupIds))

      allowedCourseIds = [...new Set(cgRows.map(r => r.courseId))]
    }
  }

  // ── Assignments (due dates) ────────────────────────────────────────────────
  const assignments = await db.select().from(lmsCourseAssignments)
    .where(eq(lmsCourseAssignments.userId, userId))

  // ── Enrolled courses ───────────────────────────────────────────────────────
  const enrollments = await db.select().from(lmsEnrollments)
    .where(eq(lmsEnrollments.userId, userId))
  const enrolledCourseIds = new Set(enrollments.map(e => e.courseId))

  // ── Certificates ───────────────────────────────────────────────────────────
  const certs = await db.select().from(lmsCertificates)
    .where(eq(lmsCertificates.userId, userId))
  const certCourseIds = new Set(certs.map(c => c.courseId))

  // ── Progress (lessons completed per course) ────────────────────────────────
  const progressRows = await db.select().from(lmsProgress)
    .where(eq(lmsProgress.userId, userId))
  const progressByCourse: Record<string, number> = {}
  for (const p of progressRows) {
    progressByCourse[p.courseId] = (progressByCourse[p.courseId] ?? 0) + 1
  }

  // ── All visible published courses ──────────────────────────────────────────
  let allCourses = await db.select().from(lmsCourses)
    .where(eq(lmsCourses.published, true))
    .orderBy(desc(lmsCourses.createdAt))

  if (allowedCourseIds !== null) {
    allCourses = allowedCourseIds.length > 0
      ? allCourses.filter(c => allowedCourseIds!.includes(c.id))
      : []
  }

  // Enrich courses
  const enriched = await Promise.all(allCourses.map(async c => {
    const [lc] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, c.id))
    const [ec] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.courseId, c.id))
    const assignment = assignments.find(a => a.courseId === c.id)
    const done = progressByCourse[c.id] ?? 0
    const total = lc.count
    const pct = total > 0 ? Math.round(done / total * 100) : 0
    const dl = daysLeft(assignment?.dueDate ?? null)
    return {
      ...c,
      lessonCount: total,
      enrollCount: ec.count,
      enrolled: enrolledCourseIds.has(c.id),
      completed: certCourseIds.has(c.id),
      pct,
      doneCount: done,
      dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      daysLeft: dl,
      overdue: dl !== null && dl < 0,
    }
  }))

  const enrolled = enriched.filter(c => c.enrolled)
  const notEnrolled = enriched.filter(c => !c.enrolled)
  const inProgress = enrolled.filter(c => !c.completed && c.pct > 0)
  const notStarted = enrolled.filter(c => !c.completed && c.pct === 0)
  const completed = enrolled.filter(c => c.completed)

  const totalLessonsCompleted = Object.values(progressByCourse).reduce((a, b) => a + b, 0)

  // ── Admin: just show manage-style course grid ──────────────────────────────
  if (isAdmin) {
    return (
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-violet-400" /> Academy
            </h1>
            <p className="text-gray-400 mt-1">All published courses</p>
          </div>
          <Link href="/lms/manage" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700">
            <Plus className="w-4 h-4" /> Manage Courses
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {enriched.map(course => (
            <Link key={course.id} href={`/lms/course/${course.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-violet-500/40 transition-all group">
              <div className="h-24 bg-gradient-to-br from-violet-900/40 to-gray-900 flex items-center justify-center text-5xl">{course.emoji}</div>
              <div className="p-4">
                <h3 className="font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2 mb-2">{course.title}</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessonCount}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.enrollCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // ── Learner Dashboard ──────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-violet-400" /> My Learning
        </h1>
        {myGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {myGroups.map(g => (
              <span key={g.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: `${g.color}25`, color: g.color, border: `1px solid ${g.color}50` }}>
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: <BookOpen className="w-5 h-5" />, label: 'Enrolled', val: enrolled.length, color: '#003CA6' },
          { icon: <TrendingUp className="w-5 h-5" />, label: 'In Progress', val: inProgress.length, color: '#7c3aed' },
          { icon: <CheckCircle className="w-5 h-5" />, label: 'Lessons Done', val: totalLessonsCompleted, color: '#059669' },
          { icon: <Award className="w-5 h-5" />, label: 'Certificates', val: certs.length, color: '#d97706' },
        ].map(({ icon, label, val, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
            <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
            <div className="text-2xl font-bold text-white">{val}</div>
            <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {enrolled.some(c => c.overdue) && (
        <div className="mb-6 rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            You have {enrolled.filter(c => c.overdue).length} overdue course{enrolled.filter(c => c.overdue).length !== 1 ? 's' : ''}. Complete them as soon as possible.
          </p>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>▶ Continue Learning</h2>
          <div className="space-y-3">
            {inProgress.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      {/* Not started enrolled */}
      {notStarted.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>📚 Start These Courses</h2>
          <div className="space-y-3">
            {notStarted.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>✅ Completed</h2>
          <div className="space-y-3">
            {completed.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      {/* Browse available (not yet enrolled) */}
      {notEnrolled.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#64748b' }}>
            {allowedCourseIds !== null ? '📖 Available in Your Groups' : '📖 All Available Courses'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {notEnrolled.map(c => (
              <Link key={c.id} href={`/lms/course/${c.id}`}
                className="rounded-xl p-4 flex items-center gap-4 transition-all hover:opacity-80"
                style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
                <span className="text-3xl flex-shrink-0">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{c.lessonCount} lessons · {c.enrollCount} enrolled</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0 font-medium" style={{ background: '#003CA6', color: '#fff' }}>Enroll</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {enriched.length === 0 && (
        <div className="text-center py-24">
          <GraduationCap className="w-12 h-12 mx-auto mb-4" style={{ color: '#334155' }} />
          <p className="text-white text-lg font-semibold mb-1">No courses available yet</p>
          <p className="text-sm" style={{ color: '#475569' }}>
            {allowedCourseIds !== null
              ? 'Your manager will add courses to your group soon'
              : 'Check back soon — courses will appear here when published'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Course card component ────────────────────────────────────────────────────
function CourseCard({ course }: { course: {
  id: string; title: string; emoji: string; lessonCount: number
  pct: number; doneCount: number; dueDate: string | null; daysLeft: number | null
  overdue: boolean; completed: boolean; enrolled: boolean
}}) {
  const dl = course.daysLeft
  const dueLabel = course.dueDate
    ? dl === null ? null
      : course.overdue ? `${Math.abs(dl)}d overdue`
      : dl === 0 ? 'Due today'
      : dl === 1 ? 'Due tomorrow'
      : `Due in ${dl}d`
    : null

  return (
    <Link href={`/lms/course/${course.id}`}
      className="flex items-center gap-4 rounded-xl p-4 transition-all hover:opacity-80"
      style={{ background: '#091525', border: `1px solid ${course.overdue ? 'rgba(239,68,68,0.4)' : '#1e3a6e'}` }}>
      <span className="text-3xl flex-shrink-0">{course.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-white font-medium text-sm truncate">{course.title}</p>
          {course.completed
            ? <span className="text-xs flex-shrink-0" style={{ color: '#10b981' }}>✅ Completed</span>
            : dueLabel
            ? <span className="text-xs flex-shrink-0 font-semibold" style={{ color: course.overdue ? '#ef4444' : '#f59e0b' }}>
                <Clock className="w-3 h-3 inline mr-1" />{dueLabel}
              </span>
            : null}
        </div>

        {/* Progress bar */}
        {!course.completed && (
          <>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${course.pct}%`, background: course.pct === 100 ? '#10b981' : '#7c3aed' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              {course.pct}% · {course.doneCount}/{course.lessonCount} lessons
            </p>
          </>
        )}
      </div>
    </Link>
  )
}
