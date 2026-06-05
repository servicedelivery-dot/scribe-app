'use client'

import { useState } from 'react'
import { Star, MessageSquare, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

interface FeedbackItem {
  id: string
  userId: string
  rating: number
  comment: string | null
  displayName: string
  createdAt: string
}

interface CourseFeedbackGroup {
  courseId: string
  courseTitle: string
  courseEmoji: string
  avgRating: number
  count: number
  feedback: FeedbackItem[]
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={sz}
          style={{
            fill: i <= Math.round(rating) ? '#f59e0b' : 'transparent',
            color: i <= Math.round(rating) ? '#f59e0b' : '#334155',
          }}
        />
      ))}
    </div>
  )
}

type SortMode = 'highest' | 'lowest' | 'most'

export default function FeedbackDashboard({ courses }: { courses: CourseFeedbackGroup[] }) {
  const [sort, setSort] = useState<SortMode>('highest')

  const sorted = [...courses].sort((a, b) => {
    if (sort === 'highest') return b.avgRating - a.avgRating
    if (sort === 'lowest') return a.avgRating - b.avgRating
    return b.count - a.count
  })

  const totalFeedback = courses.reduce((sum, c) => sum + c.count, 0)
  const overallAvg =
    courses.length > 0
      ? courses.reduce((sum, c) => sum + c.avgRating * c.count, 0) / Math.max(totalFeedback, 1)
      : 0

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400" /> Course Feedback
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>
          Learner ratings and comments across all courses
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#475569' }}>Courses Rated</p>
          <p className="text-2xl font-bold text-white">{courses.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#475569' }}>Total Responses</p>
          <p className="text-2xl font-bold text-white">{totalFeedback}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl p-4" style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#475569' }}>Overall Avg</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">{overallAvg.toFixed(1)}</p>
            <StarDisplay rating={overallAvg} size="md" />
          </div>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm" style={{ color: '#475569' }}>Sort by:</span>
        {([
          { key: 'highest', label: 'Highest Rated', icon: TrendingUp },
          { key: 'lowest', label: 'Lowest Rated', icon: TrendingDown },
          { key: 'most', label: 'Most Feedback', icon: BarChart2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: sort === key ? '#003CA6' : '#0d1b2e',
              color: sort === key ? '#fff' : '#64748b',
              border: `1px solid ${sort === key ? '#003CA6' : '#1e3a6e'}`,
            }}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Course cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-24">
          <Star className="w-12 h-12 mx-auto mb-4" style={{ color: '#1e3a6e' }} />
          <p className="text-lg" style={{ color: '#475569' }}>No feedback yet</p>
          <p className="text-sm mt-1" style={{ color: '#334155' }}>
            Learners will rate courses after completing them
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {sorted.map((course) => (
            <div
              key={course.courseId}
              className="rounded-2xl p-6"
              style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}
            >
              {/* Course header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{course.courseEmoji}</span>
                  <div>
                    <h2 className="font-semibold text-white text-lg leading-tight">{course.courseTitle}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={course.avgRating} size="md" />
                      <span className="font-bold text-white">{course.avgRating.toFixed(1)}</span>
                      <span className="text-sm" style={{ color: '#475569' }}>
                        ({course.count} {course.count === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating distribution bar */}
                <div className="hidden sm:flex flex-col gap-0.5 w-32">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const starCount = course.feedback.filter((f) => f.rating === star).length
                    const pct = course.count > 0 ? (starCount / course.count) * 100 : 0
                    return (
                      <div key={star} className="flex items-center gap-1.5">
                        <span className="text-xs w-2" style={{ color: '#64748b' }}>{star}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: '#f59e0b' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent comments */}
              {course.feedback.filter((f) => f.comment).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#475569' }}>
                    <MessageSquare className="w-3 h-3" /> Recent Comments
                  </p>
                  {course.feedback
                    .filter((f) => f.comment)
                    .slice(0, 3)
                    .map((f) => (
                      <div
                        key={f.id}
                        className="rounded-xl p-3"
                        style={{ background: '#091525', border: '1px solid #1e3a6e' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <StarDisplay rating={f.rating} />
                            <span className="text-xs font-medium text-white">{f.displayName}</span>
                          </div>
                          <span className="text-xs" style={{ color: '#334155' }}>
                            {new Date(f.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: '#94a3b8' }}>{f.comment}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
