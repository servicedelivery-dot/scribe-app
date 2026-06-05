'use client'

import { Users, BookOpen, TrendingUp, Award, CheckCircle, Activity, BarChart2, Target } from 'lucide-react'

interface TopCourse {
  rank: number
  courseId: string
  title: string
  emoji: string
  enrollments: number
  completions: number
  passRate: number | null
}

interface FeedItem {
  userId: string
  userName: string
  courseTitle: string
  enrolledAt: Date | string
}

interface Props {
  totalUsers: number
  publishedCourses: number
  totalCourses: number
  totalEnrollments: number
  totalCerts: number
  quizPassRate: number
  activeUsers: number
  avgCompletionPct: number
  totalLessonsCompleted: number
  topCourses: TopCourse[]
  recentFeed: FeedItem[]
}

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

const BG = '#0d1b2e'
const BORDER = '#1e3a6e'
const BLUE = '#003CA6'
const CYAN = '#00A3E0'
const CARD = '#091525'

export default function PlatformOverview({
  totalUsers, publishedCourses, totalCourses, totalEnrollments, totalCerts,
  quizPassRate, activeUsers, avgCompletionPct, totalLessonsCompleted,
  topCourses, recentFeed,
}: Props) {
  const kpis = [
    { icon: <Users className="w-5 h-5" />, label: 'Total Users', value: totalUsers, color: CYAN },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Published Courses', value: publishedCourses, sub: `${totalCourses} total`, color: BLUE },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Total Enrollments', value: totalEnrollments, color: '#7c3aed' },
    { icon: <Award className="w-5 h-5" />, label: 'Certificates Issued', value: totalCerts, color: '#d97706' },
    { icon: <Target className="w-5 h-5" />, label: 'Quiz Pass Rate', value: `${quizPassRate}%`, color: '#10b981' },
    { icon: <Activity className="w-5 h-5" />, label: 'Active (30d)', value: activeUsers, color: '#ec4899' },
    { icon: <BarChart2 className="w-5 h-5" />, label: 'Avg Completion %', value: `${avgCompletionPct}%`, color: CYAN },
    { icon: <CheckCircle className="w-5 h-5" />, label: 'Lessons Completed', value: totalLessonsCompleted, color: '#10b981' },
  ]

  return (
    <div className="p-6 sm:p-8 max-w-7xl" style={{ color: '#e2e8f0' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-7 h-7" style={{ color: CYAN }} />
          Platform Overview
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>Live metrics across your entire LMS</p>
      </div>

      {/* KPI Grid — 2 rows of 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ icon, label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-3" style={{ color }}>
              {icon}
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>{label}</span>
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            {sub && <div className="text-xs mt-1" style={{ color: '#475569' }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Courses Table */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
            <h2 className="font-semibold text-white text-sm">Top Courses by Enrollment</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['#', 'Course', 'Enrollments', 'Completions', 'Quiz Pass Rate'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCourses.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8" style={{ color: '#475569' }}>No enrollment data yet</td></tr>
                ) : topCourses.map(c => (
                  <tr key={c.courseId} style={{ borderBottom: `1px solid ${BORDER}20` }}
                    className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-bold text-xs" style={{ color: '#64748b' }}>#{c.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{c.emoji}</span>
                        <span className="text-white font-medium line-clamp-1">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{c.enrollments}</td>
                    <td className="px-4 py-3 text-white">{c.completions}</td>
                    <td className="px-4 py-3">
                      {c.passRate !== null ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            background: c.passRate >= 70 ? '#10b98120' : c.passRate >= 40 ? '#f59e0b20' : '#ef444420',
                            color: c.passRate >= 70 ? '#10b981' : c.passRate >= 40 ? '#f59e0b' : '#ef4444',
                          }}>
                          {c.passRate}%
                        </span>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Enrollments Feed */}
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
            <h2 className="font-semibold text-white text-sm">Recent Enrollments</h2>
          </div>
          <div className="divide-y" style={{ borderColor: `${BORDER}40` }}>
            {recentFeed.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#475569' }}>No enrollments yet</p>
            ) : recentFeed.map((item, i) => (
              <div key={i} className="px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.userName}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#64748b' }}>enrolled in <span style={{ color: CYAN }}>{item.courseTitle}</span></p>
                  </div>
                  <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#475569' }}>{timeAgo(item.enrolledAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
