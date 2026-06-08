import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import {
  lmsCourses, lmsEnrollments, lmsLessons, lmsProgress,
  lmsCourseAssignments, lmsCertificates,
  lmsUserGroups, lmsCourseGroups, lmsGroups, lmsUserRoles, lmsUserProfiles,
} from '@/lib/db/schema'
import { eq, count, desc, inArray } from 'drizzle-orm'
import Link from 'next/link'
import {
  BookOpen, CheckCircle, Award, Clock, TrendingUp, Users,
  GraduationCap, Plus, AlertTriangle, ArrowRight, BarChart2,
  Layers, ChevronRight,
} from 'lucide-react'
import CourseEnrollButton from '@/components/lms/CourseEnrollButton'
import OnboardingWizard from '@/components/lms/OnboardingWizard'

export const dynamic = 'force-dynamic'

function daysLeft(d: Date | string | null) {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

// ── Gradient palettes for course cards ────────────────────────────────────────
const GRADIENTS = [
  'from-blue-900/60 to-indigo-950',
  'from-violet-900/60 to-purple-950',
  'from-cyan-900/60 to-blue-950',
  'from-teal-900/60 to-emerald-950',
  'from-rose-900/50 to-red-950',
  'from-amber-900/50 to-orange-950',
  'from-fuchsia-900/50 to-pink-950',
  'from-lime-900/40 to-green-950',
]

function gradient(id: string) {
  let n = 0
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i)
  return GRADIENTS[n % GRADIENTS.length]
}

export default async function LmsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const clerkUser = await currentUser()
  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  const isAdmin = ['owner', 'admin', 'manager'].includes(role)

  // Check if new joiner needs onboarding
  const [profileRow] = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, userId))
  const needsOnboarding = !isAdmin && (!profileRow || !profileRow.onboardingComplete)

  // ── Group-based visibility (learner) ────────────────────────────────────────
  let allowedCourseIds: string[] | null = null
  let myGroups: { id: string; name: string; color: string }[] = []

  if (!isAdmin) {
    const userGroupRows = await db
      .select({ groupId: lmsUserGroups.groupId })
      .from(lmsUserGroups).where(eq(lmsUserGroups.userId, userId))

    if (userGroupRows.length > 0) {
      const groupIds = userGroupRows.map(r => r.groupId)
      myGroups = await db
        .select({ id: lmsGroups.id, name: lmsGroups.name, color: lmsGroups.color })
        .from(lmsGroups).where(inArray(lmsGroups.id, groupIds))
      const cgRows = await db
        .select({ courseId: lmsCourseGroups.courseId })
        .from(lmsCourseGroups).where(inArray(lmsCourseGroups.groupId, groupIds))
      allowedCourseIds = [...new Set(cgRows.map(r => r.courseId))]
    }
  }

  const assignments = await db.select().from(lmsCourseAssignments)
    .where(eq(lmsCourseAssignments.userId, userId))
  const enrollments = await db.select().from(lmsEnrollments)
    .where(eq(lmsEnrollments.userId, userId))
  const enrolledCourseIds = new Set(enrollments.map(e => e.courseId))
  const certs = await db.select().from(lmsCertificates)
    .where(eq(lmsCertificates.userId, userId))
  const certCourseIds = new Set(certs.map(c => c.courseId))
  const progressRows = await db.select().from(lmsProgress)
    .where(eq(lmsProgress.userId, userId))
  const progressByCourse: Record<string, number> = {}
  for (const p of progressRows) progressByCourse[p.courseId] = (progressByCourse[p.courseId] ?? 0) + 1

  let allCourses = await db.select().from(lmsCourses)
    .where(eq(lmsCourses.published, true)).orderBy(desc(lmsCourses.createdAt))
  if (allowedCourseIds !== null)
    allCourses = allowedCourseIds.length > 0 ? allCourses.filter(c => allowedCourseIds!.includes(c.id)) : []

  const enriched = await Promise.all(allCourses.map(async c => {
    const [lc] = await db.select({ count: count() }).from(lmsLessons).where(eq(lmsLessons.courseId, c.id))
    const [ec] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.courseId, c.id))
    const assignment = assignments.find(a => a.courseId === c.id)
    const done = progressByCourse[c.id] ?? 0
    const total = lc.count
    const pct = total > 0 ? Math.round(done / total * 100) : 0
    const dl = daysLeft(assignment?.dueDate ?? null)
    return {
      ...c, lessonCount: total, enrollCount: ec.count,
      enrolled: enrolledCourseIds.has(c.id), completed: certCourseIds.has(c.id),
      pct, doneCount: done,
      dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString() : null,
      daysLeft: dl, overdue: dl !== null && dl < 0,
    }
  }))

  // ── Admin view ───────────────────────────────────────────────────────────────
  if (isAdmin) {
    const [[totalLearners], [totalCerts], [totalEnrollments]] = await Promise.all([
      db.select({ count: count() }).from(lmsUserRoles),
      db.select({ count: count() }).from(lmsCertificates),
      db.select({ count: count() }).from(lmsEnrollments),
    ])

    const publishedCount = enriched.length
    const completionRate = totalEnrollments.count > 0
      ? Math.round((totalCerts.count / totalEnrollments.count) * 100)
      : 0

    const stats = [
      { label: 'Published Courses', value: publishedCount, icon: <BookOpen className="w-5 h-5" />, color: '#003CA6', bg: 'rgba(0,60,166,0.12)' },
      { label: 'Team Members', value: totalLearners.count, icon: <Users className="w-5 h-5" />, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
      { label: 'Enrollments', value: totalEnrollments.count, icon: <TrendingUp className="w-5 h-5" />, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
      { label: 'Certificates', value: totalCerts.count, icon: <Award className="w-5 h-5" />, color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
    ]

    const quickLinks = [
      { href: '/lms/manage', label: 'Manage Courses', icon: <BookOpen className="w-4 h-4" />, desc: 'Create & edit courses' },
      { href: '/lms/users', label: 'User Management', icon: <Users className="w-4 h-4" />, desc: 'Add or edit team members' },
      { href: '/lms/team', label: 'Team Progress', icon: <BarChart2 className="w-4 h-4" />, desc: 'Track learner completion' },
      { href: '/lms/scribe-library', label: 'Scribe Library', icon: <Layers className="w-4 h-4" />, desc: 'Manage training guides' },
    ]

    return (
      <div className="p-5 sm:p-8 max-w-7xl">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Academy</h1>
            <p className="mt-1 text-sm" style={{ color: '#4e6680' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link
            href="/lms/manage"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#003CA6' }}
          >
            <Plus className="w-4 h-4" /> New Course
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl p-5" style={{ background: '#0a1628', border: '1px solid #152035' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#f1f5f9' }}>{s.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: '#4e6680' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {quickLinks.map(q => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-3 rounded-xl p-4 transition-all hover:border-[#1e3a6e] group"
              style={{ background: '#0a1628', border: '1px solid #0f1f38' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: '#132035', color: '#00A3E0' }}>
                {q.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#cbd5e1' }}>{q.label}</p>
                <p className="text-xs truncate" style={{ color: '#334155' }}>{q.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#4e6680' }} />
            </Link>
          ))}
        </div>

        {/* Course grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#94a3b8' }}>
            All Courses <span className="ml-1.5 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: '#132035', color: '#4e6680' }}>{enriched.length}</span>
          </h2>
          <Link href="/lms/manage" className="text-xs font-medium flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: '#00A3E0' }}>
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {enriched.length === 0 ? (
          <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
            style={{ border: '1px dashed #152035' }}>
            <GraduationCap className="w-12 h-12 mb-4" style={{ color: '#1e3a6e' }} />
            <p className="font-semibold mb-1" style={{ color: '#64748b' }}>No published courses yet</p>
            <p className="text-sm mb-5" style={{ color: '#334155' }}>Create your first course to get started</p>
            <Link href="/lms/manage"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#003CA6' }}>
              Create Course
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enriched.map(course => (
              <Link
                key={course.id}
                href={`/lms/course/${course.id}`}
                className="rounded-2xl overflow-hidden group transition-all hover:translate-y-[-2px]"
                style={{ background: '#0a1628', border: '1px solid #152035' }}
              >
                {/* Cover */}
                <div className={`h-28 bg-gradient-to-br ${gradient(course.id)} flex items-center justify-center relative`}>
                  <span className="text-5xl select-none">{course.emoji}</span>
                </div>

                {/* Body */}
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-3 leading-snug transition-colors group-hover:text-white" style={{ color: '#e2e8f0' }}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#334155' }}>
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {course.enrollCount} enrolled
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Learner view ─────────────────────────────────────────────────────────────
  const enrolled = enriched.filter(c => c.enrolled)
  const notEnrolled = enriched.filter(c => !c.enrolled)
  const inProgress = enrolled.filter(c => !c.completed && c.pct > 0)
  const notStarted = enrolled.filter(c => !c.completed && c.pct === 0)
  const completed = enrolled.filter(c => c.completed)
  const totalLessonsCompleted = Object.values(progressByCourse).reduce((a, b) => a + b, 0)
  const overdueCount = enrolled.filter(c => c.overdue).length

  const stats = [
    { icon: <BookOpen className="w-5 h-5" />, label: 'Enrolled', val: enrolled.length, color: '#003CA6', bg: 'rgba(0,60,166,0.12)' },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'In Progress', val: inProgress.length, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Lessons Done', val: totalLessonsCompleted, color: '#059669', bg: 'rgba(5,150,105,0.12)' },
    { icon: <Award className="w-5 h-5" />, label: 'Certificates', val: certs.length, color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  ]

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      {needsOnboarding && (
        <OnboardingWizard userName={clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || 'there'} />
      )}

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>My Learning</h1>
        <p className="mt-1 text-sm" style={{ color: '#4e6680' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {myGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {myGroups.map(g => (
              <span key={g.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: `${g.color}20`, color: g.color, border: `1px solid ${g.color}40` }}>
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: '#0a1628', border: '1px solid #152035' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{s.val}</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#4e6680' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="mb-6 rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            You have <strong>{overdueCount}</strong> overdue course{overdueCount !== 1 ? 's' : ''} — complete them as soon as possible.
          </p>
        </div>
      )}

      {/* Continue Learning */}
      {inProgress.length > 0 && (
        <Section label="Continue Learning" emoji="▶">
          {inProgress.map(c => <CourseCard key={c.id} course={c} />)}
        </Section>
      )}

      {/* Not started */}
      {notStarted.length > 0 && (
        <Section label="Start These Courses" emoji="📚">
          {notStarted.map(c => <CourseCard key={c.id} course={c} />)}
        </Section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Section label="Completed" emoji="✅">
          {completed.map(c => <CourseCard key={c.id} course={c} />)}
        </Section>
      )}

      {/* Browse */}
      {notEnrolled.length > 0 && (
        <Section label={allowedCourseIds !== null ? 'Available in Your Groups' : 'All Available Courses'} emoji="📖">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notEnrolled.map(c => (
              <Link key={c.id} href={`/lms/course/${c.id}`}
                className="flex items-center gap-4 rounded-xl p-4 transition-all hover:border-[#1e3a6e]"
                style={{ background: '#0a1628', border: '1px solid #0f1f38' }}>
                <span className="text-3xl flex-shrink-0 leading-none">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#e2e8f0' }}>{c.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#334155' }}>
                    {c.lessonCount} lessons · {c.enrollCount} enrolled
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 font-semibold text-white" style={{ background: '#003CA6' }}>
                  Enroll
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {enriched.length === 0 && (
        <div className="text-center py-24">
          <GraduationCap className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e3a6e' }} />
          <p className="text-lg font-semibold mb-1" style={{ color: '#64748b' }}>No courses available yet</p>
          <p className="text-sm" style={{ color: '#334155' }}>
            {allowedCourseIds !== null
              ? 'Your manager will add courses to your group soon'
              : 'Check back soon — courses will appear here when published'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, emoji, children }: { label: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{emoji}</span>
        <h2 className="text-sm font-semibold" style={{ color: '#64748b' }}>{label}</h2>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

// ── Course card ───────────────────────────────────────────────────────────────
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
      className="flex items-center gap-4 rounded-xl p-4 transition-all hover:translate-y-[-1px] hover:border-[#1e3a6e]"
      style={{
        background: '#0a1628',
        border: `1px solid ${course.overdue ? 'rgba(239,68,68,0.25)' : '#0f1f38'}`,
      }}>

      <span className="text-3xl flex-shrink-0 leading-none">{course.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold truncate" style={{ color: '#e2e8f0' }}>{course.title}</p>
          {course.completed ? (
            <span className="text-xs flex-shrink-0 font-medium" style={{ color: '#10b981' }}>✅ Done</span>
          ) : dueLabel ? (
            <span className="text-xs flex-shrink-0 font-semibold flex items-center gap-1"
              style={{ color: course.overdue ? '#f87171' : '#fbbf24' }}>
              <Clock className="w-3 h-3" />{dueLabel}
            </span>
          ) : null}
        </div>

        {!course.completed && (
          <>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#132035' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${course.pct}%`,
                  background: course.pct === 100 ? '#10b981' : course.overdue ? '#ef4444' : '#7c3aed',
                }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#334155' }}>
              {course.pct}% · {course.doneCount}/{course.lessonCount} lessons
            </p>
          </>
        )}
      </div>

      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#1e3a6e' }} />
    </Link>
  )
}
