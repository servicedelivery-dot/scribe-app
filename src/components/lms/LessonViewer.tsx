'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { CheckCircle, ChevronLeft, ChevronRight, Menu, X, Clock, BarChart2, Globe } from 'lucide-react'
import QuizPlayer from './QuizPlayer'

interface Lesson { id: string; title: string; content: string; completed?: boolean; orderIndex: number; moduleId: string; courseId: string }
interface Module { id: string; title: string; lessons: Lesson[] }
interface Course { id: string; title: string; emoji: string; passScoreRequired?: number }

interface Props {
  course: Course
  currentLesson: Lesson
  modules: Module[]
  nextLesson: Lesson | null
  prevLesson: Lesson | null
  completedCount: number
  totalLessons: number
  isLastLesson?: boolean
}

export default function LessonViewer({ course, currentLesson, modules, nextLesson, prevLesson, completedCount, totalLessons, isLastLesson }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const [completed, setCompleted] = useState(currentLesson.completed)
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [endOfCourseQuiz, setEndOfCourseQuiz] = useState<any[]>([])
  const [showEndQuiz, setShowEndQuiz] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [showCertModal, setShowCertModal] = useState(false)
  const [earnedCert, setEarnedCert] = useState<{ certificateNumber: string; courseTitle: string; recipientName: string } | null>(null)
  const [videoProgress, setVideoProgress] = useState(0) // 0-100 watched %
  const [videoResumePos, setVideoResumePos] = useState(0) // seconds — resume from last position
  const [videoDuration, setVideoDuration] = useState(0)   // total seconds
  const [scribeMode, setScribeMode] = useState<'slides' | 'movie' | 'scroll'>('slides')

  // Parse structured content (scribe / pdf / html / embed / url)
  const parsedContent = (() => {
    try { return JSON.parse(currentLesson.content) } catch { return null }
  })()
  const scribeData   = parsedContent?.__scribe   ? parsedContent : null
  const pdfData      = parsedContent?.__pdf      ? parsedContent : null
  const htmlData     = parsedContent?.__html     ? parsedContent : null
  const embedData    = parsedContent?.__embed    ? parsedContent : null
  const urlData      = parsedContent?.__url      ? parsedContent : null
  const videoData    = parsedContent?.__video    ? parsedContent : null
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/lms/quizzes?courseId=${course.id}&lessonId=${currentLesson.id}`)
      .then(r => r.json()).then(setQuizQuestions).catch(() => {})

    // Load end-of-course quiz if last lesson
    if (isLastLesson) {
      fetch(`/api/lms/quizzes?courseId=${course.id}&endOfCourse=1`)
        .then(r => r.json()).then(setEndOfCourseQuiz).catch(() => {})
    }

    // Load saved video position for resume
    fetch(`/api/lms/video-progress?courseId=${course.id}`)
      .then(r => r.json())
      .then((rows: {lessonId:string; lastPosition:number; totalSeconds:number; watchedSeconds:number}[]) => {
        const row = rows.find(r => r.lessonId === currentLesson.id)
        if (row) {
          setVideoResumePos(row.lastPosition || 0)
          setVideoDuration(row.totalSeconds || 0)
          if (row.totalSeconds > 0) setVideoProgress(Math.round((row.watchedSeconds / row.totalSeconds) * 100))
        }
      }).catch(() => {})
  }, [course.id, currentLesson.id, isLastLesson])

  // Track video progress — saves every 5s, resumes from last position
  function handleVideoTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const vid = e.currentTarget
    if (!vid.duration) return
    const pct = Math.round((vid.currentTime / vid.duration) * 100)
    setVideoProgress(pct)
    setVideoDuration(vid.duration)

    if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current)
    progressSaveTimer.current = setTimeout(() => {
      fetch('/api/lms/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          courseId: course.id,
          watchedSeconds: vid.currentTime,
          totalSeconds: vid.duration,
          lastPosition: vid.currentTime,
          completed: pct >= 90,
        }),
      }).catch(() => {})
      // Auto-mark lesson complete at 90%
      if (pct >= 90 && !completed) markComplete()
    }, 5000)
  }

  function handleVideoLoaded(e: React.SyntheticEvent<HTMLVideoElement>) {
    const vid = e.currentTarget
    setVideoDuration(vid.duration)
    // Resume from saved position
    if (videoResumePos > 10) { vid.currentTime = videoResumePos }
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function markComplete() {
    if (completed) return
    setMarking(true)
    const res = await fetch('/api/lms/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: currentLesson.id, courseId: course.id }),
    })
    const data = await res.json()
    setCompleted(true)
    setMarking(false)

    if (data.allComplete) {
      if (data.hasQuiz) {
        // Has end-of-course quiz — show it
        setShowEndQuiz(true)
      } else if (data.certificate) {
        // No quiz — certificate auto-issued, show congrats modal
        setEarnedCert(data.certificate)
        setShowCertModal(true)
      }
    }

    router.refresh()
  }

  async function completeAndNext() {
    await markComplete()
    if (nextLesson) router.push(`/lms/learn/${course.id}/${nextLesson.id}`)
  }

  const progress = Math.round(completedCount / totalLessons * 100)

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Lesson sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 overflow-hidden transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col fixed lg:relative h-full z-30 lg:z-auto`}>
        <div className="p-4 border-b border-gray-800">
          <Link href={`/lms/course/${course.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-3">
            <ChevronLeft className="w-4 h-4" /> Back to course
          </Link>
          <h2 className="font-semibold text-white text-sm line-clamp-2">{course.emoji} {course.title}</h2>
          <div className="mt-2">
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{completedCount}/{totalLessons} completed</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {modules.map((mod) => (
            <div key={mod.id}>
              <p className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide bg-gray-800/50">{mod.title}</p>
              {mod.lessons.map(lesson => (
                <Link
                  key={lesson.id}
                  href={`/lms/learn/${course.id}/${lesson.id}`}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800 text-sm transition-colors ${lesson.id === currentLesson.id ? 'bg-violet-600/20 text-violet-300' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${lesson.completed ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                    {lesson.completed && <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />}
                  </div>
                  <span className="line-clamp-2">{lesson.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-gray-400 text-sm truncate flex-1 min-w-0">{currentLesson.title}</span>
          {completed && <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>}
        </div>

        {/* Lesson body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">{currentLesson.title}</h1>

            {/* ── Video lesson ── */}
            {videoData && (
              <div className="space-y-3">
                {/* Resume banner */}
                {videoResumePos > 10 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(0,163,224,0.1)', border: '1px solid rgba(0,163,224,0.2)', color: '#00A3E0' }}>
                    ▶ Resuming from {formatTime(videoResumePos)}
                  </div>
                )}
                <video
                  src={videoData.url}
                  controls
                  className="w-full rounded-xl"
                  style={{ maxHeight: 520, background: '#000', border: '1px solid #1e3a6e' }}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoaded}
                />
                {/* Progress bar + stats */}
                {videoDuration > 0 && (
                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${videoProgress}%`, background: videoProgress >= 90 ? '#10b981' : '#003CA6' }} />
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: '#475569' }}>
                      <span>{videoProgress}% watched</span>
                      <span>
                        {videoProgress >= 90
                          ? '✅ Completed'
                          : `${formatTime(Math.max(0, videoDuration - (videoDuration * videoProgress / 100)))} left`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PDF ── */}
            {pdfData && (
              <div>
                <iframe src={pdfData.url} className="w-full rounded-xl" style={{ height: 700, border: 0 }} />
                <a href={pdfData.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs mt-2" style={{ color: '#00A3E0' }}>
                  ⬇ Download {pdfData.name}
                </a>
              </div>
            )}

            {/* ── HTML ── */}
            {htmlData && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e3a6e' }}>
                <iframe srcDoc={htmlData.html} className="w-full" style={{ minHeight: 600, border: 0 }} sandbox="allow-same-origin" />
              </div>
            )}

            {/* ── Embed / iFrame ── */}
            {embedData && (
              <div dangerouslySetInnerHTML={{ __html: embedData.html }}
                className="w-full [&>iframe]:w-full [&>iframe]:rounded-xl" />
            )}

            {/* ── URL / Link ── */}
            {urlData && (
              <div className="rounded-xl p-6 text-center" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
                <Globe className="w-10 h-10 mx-auto mb-3" style={{ color: '#00A3E0' }} />
                <p className="text-white font-medium mb-2">{urlData.label}</p>
                <a href={urlData.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#003CA6' }}>
                  Open Resource →
                </a>
                <p className="text-xs mt-3 break-all" style={{ color: '#475569' }}>{urlData.url}</p>
              </div>
            )}

            {/* ── Scribe guide lesson ── */}
            {scribeData ? (
              <div>
                {/* View mode tabs */}
                <div className="flex gap-2 mb-4">
                  {(['slides', 'movie', 'scroll'] as const).map(mode => (
                    <button key={mode} onClick={() => setScribeMode(mode)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: scribeMode === mode ? '#003CA6' : '#1e293b', color: scribeMode === mode ? '#fff' : '#94a3b8' }}>
                      {mode === 'slides' ? '🖼 Slides' : mode === 'movie' ? '▶ Movie' : '📜 Scroll'}
                    </button>
                  ))}
                </div>

                {/* Movie tab: native player for direct video files, iframe for Scribe embed URLs */}
                {scribeMode === 'movie' && scribeData.movie && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(scribeData.movie) ? (
                  <div className="space-y-3">
                    {videoResumePos > 10 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'rgba(0,163,224,0.1)', border: '1px solid rgba(0,163,224,0.2)', color: '#00A3E0' }}>
                        ▶ Resuming from {formatTime(videoResumePos)}
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      src={scribeData.movie}
                      controls
                      className="w-full rounded-xl"
                      style={{ maxHeight: 520, background: '#000', border: '1px solid #1e3a6e' }}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={handleVideoLoaded}
                    />
                    {videoDuration > 0 && (
                      <div className="space-y-1.5">
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${videoProgress}%`, background: videoProgress >= 90 ? '#10b981' : '#003CA6' }} />
                        </div>
                        <div className="flex items-center justify-between text-xs" style={{ color: '#475569' }}>
                          <span>{videoProgress}% watched</span>
                          <span>{videoProgress >= 90 ? '✅ Completed' : `${formatTime(Math.max(0, videoDuration - (videoDuration * videoProgress / 100)))} left`}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <iframe
                    key={scribeMode}
                    src={scribeMode === 'slides' ? scribeData.slides : scribeMode === 'movie' ? scribeData.movie : scribeData.scroll}
                    width="100%"
                    style={{ border: 0, borderRadius: 12, minHeight: 'clamp(300px, 50vw, 560px)', display: 'block' }}
                    allow="fullscreen"
                  />
                )}
              </div>
            ) : (
            <article className="prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-code:text-violet-300 max-w-none">
              {currentLesson.content ? (
                <ReactMarkdown>{currentLesson.content}</ReactMarkdown>
              ) : (
                <p className="text-gray-500 italic">No content yet for this lesson.</p>
              )}

            {/* Lesson quiz */}
            {quizQuestions.length > 0 && (
              <QuizPlayer
                questions={quizQuestions}
                courseId={course.id}
                lessonId={currentLesson.id}
                onComplete={markComplete}
              />
            )}

            {/* End-of-course quiz gate */}
            {isLastLesson && !showEndQuiz && !quizPassed && endOfCourseQuiz.length > 0 && completed && (
              <div className="mt-8 p-5 bg-violet-900/20 border border-violet-700/50 rounded-xl text-center">
                <div className="text-3xl mb-3">🎓</div>
                <h3 className="text-white font-semibold mb-2">You've reached the final assessment</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Pass the quiz with {course.passScoreRequired ?? 70}% or higher to complete this course and earn your certificate.
                </p>
                <button onClick={() => setShowEndQuiz(true)}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors">
                  Start Final Quiz ({endOfCourseQuiz.length} questions)
                </button>
              </div>
            )}

            {isLastLesson && showEndQuiz && endOfCourseQuiz.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-semibold mb-4">🎓 Final Assessment</h3>
                <QuizPlayer
                  questions={endOfCourseQuiz}
                  courseId={course.id}
                  lessonId={null}
                  onComplete={() => setQuizPassed(true)}
                />
              </div>
            )}
            </article>
            )} {/* end scribe conditional */}
          </div>
        </div>

        {/* Footer nav */}
        <div className="bg-gray-900 border-t border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-0 sm:h-16 gap-2 sm:gap-0 flex-shrink-0">
          <div>
            {prevLesson && (
              <Link href={`/lms/learn/${course.id}/${prevLesson.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Link>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {!completed && (
              <button onClick={markComplete} disabled={marking} className="w-full sm:w-auto px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                {marking && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Mark complete
              </button>
            )}
            {nextLesson ? (
              <button onClick={completeAndNext} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : completed ? (
              <button onClick={() => { if (earnedCert) setShowCertModal(true); else if (endOfCourseQuiz.length > 0) setShowEndQuiz(true) }}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                🎓 {earnedCert ? 'View Certificate' : endOfCourseQuiz.length > 0 ? 'Take Final Quiz' : 'Course Complete!'}
              </button>
            ) : (
              <Link href={`/lms/course/${course.id}`} className="w-full sm:w-auto text-center px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
                Finish Course 🎉
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Certificate earned modal */}
      {showCertModal && earnedCert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl w-full max-w-md mx-4 text-center p-6 sm:p-8 space-y-4" style={{ background: '#080f1e', border: '1px solid #1e3a6e' }}>
            <div className="text-6xl animate-bounce">🎓</div>
            <h2 className="text-2xl font-bold text-white">Certificate Earned!</h2>
            <p className="text-gray-400">Congratulations, <span className="text-white font-semibold">{earnedCert.recipientName}</span>!</p>
            <div className="rounded-xl p-4 text-sm" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
              <p className="text-white font-semibold">{earnedCert.courseTitle}</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>Certificate #{earnedCert.certificateNumber}</p>
            </div>
            <p className="text-xs" style={{ color: '#475569' }}>Your certificate has been saved and is available in the Certificates section.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCertModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-400" style={{ background: '#1e293b' }}>
                Close
              </button>
              <Link href="/lms/certificates"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white text-center"
                style={{ background: '#003CA6' }}>
                View Certificate →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
