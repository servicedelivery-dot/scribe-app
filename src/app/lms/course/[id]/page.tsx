import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsCourses, lmsModules, lmsLessons, lmsEnrollments, lmsProgress, lmsCertificates, lmsQuizQuestions, lmsCourseFeedback, lmsCourseAssignments } from '@/lib/db/schema'
import { eq, and, asc, count, isNull } from 'drizzle-orm'
import Link from 'next/link'
import CourseEnrollButton from '@/components/lms/CourseEnrollButton'
import CourseFeedbackWidget from '@/components/lms/CourseFeedbackWidget'
import { BookOpen, CheckCircle, Award, Users, Lock, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id))
  if (!course) notFound()

  const modules = await db.select().from(lmsModules).where(eq(lmsModules.courseId, id)).orderBy(asc(lmsModules.orderIndex))
  const lessons = await db.select().from(lmsLessons).where(eq(lmsLessons.courseId, id)).orderBy(asc(lmsLessons.orderIndex))
  const [enrollCount] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.courseId, id))

  const enrolled = userId
    ? (await db.select().from(lmsEnrollments).where(and(eq(lmsEnrollments.courseId, id), eq(lmsEnrollments.userId, userId!)))).length > 0
    : false

  const progress = userId
    ? await db.select().from(lmsProgress).where(and(eq(lmsProgress.courseId, id), eq(lmsProgress.userId, userId!)))
    : []
  const completedIds = new Set(progress.map(p => p.lessonId))

  const allComplete = enrolled && lessons.length > 0 && completedIds.size >= lessons.length

  // Always fetch end-of-course quiz count — show it in curriculum regardless of progress
  const endQuizRows = await db.select().from(lmsQuizQuestions)
    .where(and(eq(lmsQuizQuestions.courseId, id), isNull(lmsQuizQuestions.lessonId)))
  const endQuizCount = endQuizRows.length

  // Certificate
  const existingCert = userId
    ? await db.select().from(lmsCertificates).where(and(eq(lmsCertificates.userId, userId), eq(lmsCertificates.courseId, id)))
    : []

  // Existing feedback from this user
  const existingFeedback = userId && existingCert.length > 0
    ? await db.select().from(lmsCourseFeedback).where(and(eq(lmsCourseFeedback.userId, userId), eq(lmsCourseFeedback.courseId, id)))
    : []

  const firstLesson = lessons[0]
  const lastLesson = lessons[lessons.length - 1]
  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.moduleId === m.id),
  }))

  const pct = lessons.length > 0 ? Math.round(completedIds.size / lessons.length * 100) : 0

  const [assignment] = userId
    ? await db.select().from(lmsCourseAssignments).where(and(eq(lmsCourseAssignments.userId, userId!), eq(lmsCourseAssignments.courseId, id)))
    : []
  const dueDate = assignment?.dueDate ?? null
  const daysLeft = dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000) : null
  const isOverdue = daysLeft !== null && daysLeft < 0

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      {/* Header */}
      <div className="text-6xl mb-4">{course.emoji}</div>
      <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
      {course.description && <p className="text-gray-400 mb-4">{course.description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
        <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{lessons.length} lesson{lessons.length !== 1 ? 's' : ''}</span>
        {endQuizCount > 0 && <span className="flex items-center gap-1.5">📝 Final assessment</span>}
        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{enrollCount.count} enrolled</span>
        {enrolled && <span className="flex items-center gap-1.5 text-green-400"><CheckCircle className="w-4 h-4" />{completedIds.size}/{lessons.length} completed</span>}
      </div>

      {/* Progress bar */}
      {enrolled && lessons.length > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{pct}% complete</p>
        </div>
      )}

      {/* AI Overview card */}
      {course.aiOverview && (() => {
        try {
          const ov = JSON.parse(course.aiOverview) as { summary?: string; points?: string[] }
          if (!ov.points?.length) return null
          return (
            <div className="mb-6 rounded-2xl p-5" style={{ background: '#0a1628', border: '1px solid #152035' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">✨</span>
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4e6680' }}>Course Overview</h3>
              </div>
              {ov.summary && (
                <p className="text-sm mb-3 leading-relaxed" style={{ color: '#94a3b8' }}>{ov.summary}</p>
              )}
              <ul className="space-y-2">
                {ov.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: 'rgba(0,163,224,0.15)', color: '#00A3E0' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm" style={{ color: '#cbd5e1' }}>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        } catch { return null }
      })()}

      {/* Deadline banner */}
      {dueDate && (
        <div className="mb-6 rounded-xl p-4 flex items-center gap-3"
          style={{
            background: isOverdue ? 'rgba(239,68,68,0.07)' : 'rgba(251,191,36,0.07)',
            border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.25)'}`,
          }}>
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.1)' }}>
            <Clock className="w-4 h-4" style={{ color: isOverdue ? '#f87171' : '#fbbf24' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: isOverdue ? '#fca5a5' : '#fde68a' }}>
              {isOverdue
                ? `Overdue by ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''}`
                : daysLeft === 0 ? 'Due today'
                : daysLeft === 1 ? 'Due tomorrow'
                : `Due in ${daysLeft} days`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: isOverdue ? '#fca5a5' : '#fde68a', opacity: 0.7 }}>
              Deadline: {new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* Certificate banner */}
      {existingCert.length > 0 && (
        <div className="mb-6 rounded-2xl p-5 flex items-center gap-4" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)' }}>
          <div className="text-4xl">🎓</div>
          <div className="flex-1">
            <p className="font-bold text-white">Course complete — certificate earned!</p>
            <p className="text-sm mt-0.5" style={{ color: '#6ee7b7' }}>
              #{existingCert[0].certificateNumber} · {new Date(existingCert[0].issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/lms/certificates" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#059669' }}>
            View →
          </Link>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-wrap gap-3 mb-8">
        {enrolled && firstLesson ? (
          <>
            {existingCert.length > 0 ? (
              <>
                <Link href="/lms/certificates"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white"
                  style={{ background: '#059669' }}>
                  <Award className="w-5 h-5" /> View Certificate
                </Link>
                <Link href={`/lms/learn/${id}/${firstLesson.id}`}
                  className="px-6 py-2.5 rounded-xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                  Review Course
                </Link>
              </>
            ) : allComplete && endQuizCount > 0 ? (
              <>
                <Link href={`/lms/learn/${id}/${lastLesson.id}`}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-colors"
                  style={{ background: '#7c3aed' }}>
                  📝 Take Final Assessment ({endQuizCount} questions)
                </Link>
                <Link href={`/lms/learn/${id}/${firstLesson.id}`}
                  className="px-6 py-2.5 rounded-xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                  Review Lessons
                </Link>
              </>
            ) : (
              <Link href={`/lms/learn/${id}/${firstLesson.id}`}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors">
                {completedIds.size > 0 ? 'Continue Learning' : 'Start Course'}
              </Link>
            )}
          </>
        ) : (
          <CourseEnrollButton courseId={id} />
        )}
      </div>

      {/* Curriculum */}
      <h2 className="text-lg font-semibold text-white mb-4">Curriculum</h2>
      <div className="space-y-3">
        {modulesWithLessons.map((mod, mi) => (
          <div key={mod.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
              <span className="font-medium text-white text-sm">Module {mi + 1}: {mod.title}</span>
              <span className="text-xs text-gray-500">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
            </div>
            {mod.lessons.map(lesson => (
              <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-800">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${completedIds.has(lesson.id) ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                  {completedIds.has(lesson.id) && <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />}
                </div>
                {enrolled ? (
                  <Link href={`/lms/learn/${id}/${lesson.id}`} className="text-sm text-gray-300 hover:text-white transition-colors flex-1">
                    {lesson.title}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500 flex-1">{lesson.title}</span>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Final Assessment — always show if quiz exists */}
        {endQuizCount > 0 && (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: allComplete ? '#7c3aed' : '#374151', background: allComplete ? 'rgba(124,58,237,0.08)' : '#111827' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: allComplete ? 'rgba(124,58,237,0.15)' : '#1f2937' }}>
              <span className="font-medium text-sm" style={{ color: allComplete ? '#c4b5fd' : '#9ca3af' }}>
                📝 Final Assessment
              </span>
              <span className="text-xs" style={{ color: allComplete ? '#a78bfa' : '#6b7280' }}>
                {endQuizCount} question{endQuizCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: allComplete ? 'rgba(124,58,237,0.3)' : '#374151' }}>
              {existingCert.length > 0 ? (
                <div className="w-5 h-5 rounded-full bg-green-500 border-green-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 flex-shrink-0"
                  style={{ borderColor: allComplete ? '#7c3aed' : '#374151' }}>
                  {!allComplete && <Lock className="w-3 h-3 text-gray-600" />}
                </div>
              )}
              {allComplete ? (
                <Link href={`/lms/learn/${id}/${lastLesson!.id}`}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#a78bfa' }}>
                  {existingCert.length > 0 ? '✅ Passed — click to retake' : 'Take the final quiz to earn your certificate →'}
                </Link>
              ) : (
                <span className="text-sm text-gray-600">
                  Complete all lessons to unlock the final assessment
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback widget — only for certified learners */}
      {existingCert.length > 0 && (
        <CourseFeedbackWidget
          courseId={id}
          existingRating={existingFeedback[0]?.rating ?? null}
          existingComment={existingFeedback[0]?.comment ?? null}
        />
      )}
    </div>
  )
}
