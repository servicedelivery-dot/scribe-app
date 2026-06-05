'use client'

import { BookOpen, Users, Award, TrendingUp, CheckCircle, Target } from 'lucide-react'

interface KPIs {
  totalCourses: number
  totalEnrollments: number
  totalCompletions: number
  totalCertificates: number
  completionRate: number
  quizPassRate: number
}

interface TopCourse {
  courseId: string
  title: string
  emoji: string
  enrollCount: number
  lessonCount: number
  completions: number
}

interface Props {
  data: {
    kpis: KPIs
    enrollmentsByDay: { day: string; count: number }[]
    topCourses: TopCourse[]
  }
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}

function BarChart({ data }: { data: { day: string; count: number }[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-32 text-gray-600 text-sm">No data yet</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.slice(-20).map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end group">
          <div
            className="w-full bg-violet-600/60 hover:bg-violet-500 rounded-t transition-colors relative group"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            title={`${d.day}: ${d.count}`}
          />
        </div>
      ))}
    </div>
  )
}

function DonutChart({ rate, label, color }: { rate: number; label: string; color: string }) {
  const r = 36; const circ = 2 * Math.PI * r
  const dash = (rate / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{rate}%</span>
        </div>
      </div>
      <p className="text-gray-400 text-xs text-center">{label}</p>
    </div>
  )
}

export default function AnalyticsDashboard({ data }: Props) {
  const { kpis, enrollmentsByDay, topCourses } = data

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-violet-400" /> Analytics
        </h1>
        <p className="text-gray-400 mt-1">Overview of learner activity and course performance</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Published Courses" value={kpis.totalCourses} icon={<BookOpen className="w-4 h-4 text-violet-400" />} color="bg-violet-600/20" />
        <KpiCard label="Total Enrollments" value={kpis.totalEnrollments} icon={<Users className="w-4 h-4 text-blue-400" />} color="bg-blue-600/20" />
        <KpiCard label="Certificates Issued" value={kpis.totalCertificates} icon={<Award className="w-4 h-4 text-yellow-400" />} color="bg-yellow-600/20" />
        <KpiCard label="Completions" value={kpis.totalCompletions} icon={<CheckCircle className="w-4 h-4 text-green-400" />} color="bg-green-600/20" sub="Course completions" />
        <KpiCard label="Completion Rate" value={`${kpis.completionRate}%`} icon={<Target className="w-4 h-4 text-pink-400" />} color="bg-pink-600/20" sub="Enrolled → completed" />
        <KpiCard label="Quiz Pass Rate" value={`${kpis.quizPassRate}%`} icon={<TrendingUp className="w-4 h-4 text-orange-400" />} color="bg-orange-600/20" sub="Across all attempts" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Enrollment chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Enrollments (last 30 days)</h3>
          <BarChart data={enrollmentsByDay} />
          {enrollmentsByDay.length > 0 && (
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>{enrollmentsByDay[0]?.day}</span>
              <span>{enrollmentsByDay[enrollmentsByDay.length - 1]?.day}</span>
            </div>
          )}
        </div>

        {/* Donut charts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center gap-6">
          <h3 className="text-white font-semibold w-full">Rates</h3>
          <div className="flex gap-6">
            <DonutChart rate={kpis.completionRate} label="Completion" color="#7c3aed" />
            <DonutChart rate={kpis.quizPassRate} label="Quiz pass" color="#16a34a" />
          </div>
        </div>
      </div>

      {/* Top courses */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Top Courses by Enrollment</h3>
        {topCourses.length === 0 ? (
          <p className="text-gray-600 text-sm">No courses enrolled yet</p>
        ) : (
          <div className="space-y-3">
            {topCourses.map((c, i) => (
              <div key={c.courseId} className="flex items-center gap-4">
                <span className="text-gray-600 text-sm w-5 text-right">{i + 1}</span>
                <span className="text-2xl">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.title}</p>
                  <p className="text-gray-500 text-xs">{c.lessonCount} lessons · {c.completions} completions</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{c.enrollCount}</p>
                  <p className="text-gray-600 text-xs">enrolled</p>
                </div>
                <div className="w-24">
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className="bg-violet-500 h-1.5 rounded-full"
                      style={{ width: `${c.enrollCount > 0 ? Math.round((c.completions / c.enrollCount) * 100) : 0}%` }} />
                  </div>
                  <p className="text-gray-600 text-xs text-right mt-0.5">
                    {c.enrollCount > 0 ? Math.round((c.completions / c.enrollCount) * 100) : 0}% done
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
