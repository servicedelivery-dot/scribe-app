'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ChevronDown, ChevronRight, Save, Eye, Globe, EyeOff, Loader2, ArrowLeft, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import QuizEditor from './QuizEditor'
import QuizResults from './QuizResults'
import VideoMetricsPanel from './VideoMetricsPanel'
import LessonQRPanel from './LessonQRPanel'

interface Lesson { id: string; title: string; content: string; orderIndex: number; moduleId: string; courseId: string }
interface Module { id: string; title: string; orderIndex: number; courseId: string; lessons: Lesson[] }
interface Course { id: string; title: string; description: string | null; emoji: string; published: boolean }

interface Props {
  course: Course
  initialModules: Module[]
}

export default function CourseEditor({ course, initialModules }: Props) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [published, setPublished] = useState(course.published)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(initialModules.map(m => m.id)))
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [activeView, setActiveView] = useState<'lesson' | 'course-quiz' | 'quiz-results'>('lesson')
  const [lessonContent, setLessonContent] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [activeTab, setActiveTab] = useState<'content' | 'quiz' | 'qr'>('content')
  const [saving, setSaving] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoGenMsg, setAutoGenMsg] = useState('')
  const [generatingOverview, setGeneratingOverview] = useState(false)
  const [overviewMsg, setOverviewMsg] = useState('')
  const router = useRouter()

  async function saveSettings() {
    setSaving(true)
    await fetch(`/api/lms/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, published }),
    })
    setSaving(false)
    router.refresh()
  }

  async function addModule() {
    const res = await fetch('/api/lms/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id, title: 'New Module', orderIndex: modules.length }),
    })
    const mod = await res.json()
    setModules(prev => [...prev, { ...mod, lessons: [] }])
    setExpandedModules(prev => new Set([...prev, mod.id]))
  }

  async function deleteModule(moduleId: string) {
    await fetch('/api/lms/modules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: moduleId }),
    })
    setModules(prev => prev.filter(m => m.id !== moduleId))
    if (activeLesson?.moduleId === moduleId) setActiveLesson(null)
  }

  async function addLesson(moduleId: string) {
    const mod = modules.find(m => m.id === moduleId)!
    const res = await fetch('/api/lms/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, courseId: course.id, title: 'New Lesson', content: '', orderIndex: mod.lessons.length }),
    })
    const lesson = await res.json()
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m))
    openLesson(lesson)
  }

  async function deleteLesson(lessonId: string, moduleId: string) {
    await fetch('/api/lms/lessons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lessonId }),
    })
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m))
    if (activeLesson?.id === lessonId) setActiveLesson(null)
  }

  function openLesson(lesson: Lesson) {
    setActiveLesson(lesson)
    setActiveView('lesson')
    setLessonTitle(lesson.title)
    setLessonContent(lesson.content)
  }

  async function saveLesson() {
    if (!activeLesson) return
    setSaving(true)
    const res = await fetch('/api/lms/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeLesson.id, title: lessonTitle, content: lessonContent }),
    })
    const updated = await res.json()
    setModules(prev => prev.map(m => m.id === activeLesson.moduleId ? { ...m, lessons: m.lessons.map(l => l.id === activeLesson.id ? updated : l) } : m))
    setActiveLesson(updated)
    setSaving(false)
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-950">
      {/* Left: structure panel */}
      <div className="w-full lg:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-900 flex flex-col h-auto lg:h-full max-h-64 lg:max-h-full overflow-y-auto lg:overflow-visible">
        <div className="p-4 border-b border-gray-800">
          <Link href="/lms/manage" className="flex items-center gap-1 text-gray-400 hover:text-white text-xs mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" /> All courses
          </Link>
          <div className="text-2xl mb-2">{course.emoji}</div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-gray-600 pb-0.5" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description..."
            className="w-full bg-transparent text-gray-400 text-xs mt-1 resize-none focus:outline-none" />
        </div>

        {/* Modules */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {modules.map(mod => (
            <div key={mod.id}>
              <div className="flex items-center gap-1 group">
                <button onClick={() => setExpandedModules(prev => { const s = new Set(prev); s.has(mod.id) ? s.delete(mod.id) : s.add(mod.id); return s })}
                  className="flex items-center gap-1.5 flex-1 px-2 py-1.5 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  {expandedModules.has(mod.id) ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                  <span className="truncate">{mod.title}</span>
                </button>
                <button onClick={() => deleteModule(mod.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-900/30 rounded transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {expandedModules.has(mod.id) && (
                <div className="ml-5 space-y-0.5 mt-0.5">
                  {mod.lessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-1 group/lesson">
                      <button onClick={() => openLesson(lesson)}
                        className={`flex-1 text-left px-2 py-1.5 text-xs rounded-lg transition-colors truncate ${activeLesson?.id === lesson.id ? 'bg-[#003CA6]/20 text-[#00A3E0]' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}>
                        {lesson.title}
                      </button>
                      <button onClick={() => deleteLesson(lesson.id, mod.id)} className="opacity-0 group-hover/lesson:opacity-100 p-1 text-red-500 hover:bg-red-900/30 rounded transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addLesson(mod.id)} className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add lesson
                  </button>
                </div>
              )}
            </div>
          ))}
          <button onClick={addModule} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors mt-2">
            <Plus className="w-4 h-4" /> Add module
          </button>
        </div>

        {/* Bottom actions */}
        <div className="p-3 border-t border-gray-800 space-y-2">

          {/* Course Assessment shortcut */}
          <button
            onClick={() => { setActiveLesson(null); setActiveView('course-quiz') }}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors border ${activeView === 'course-quiz' ? 'bg-[#003CA6]/30 text-[#60c8f0] border-[#003CA6]' : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-white'}`}
          >
            📝 Course Assessment
          </button>

          {/* Quiz Results shortcut */}
          <button
            onClick={() => { setActiveLesson(null); setActiveView('quiz-results') }}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors border ${activeView === 'quiz-results' ? 'bg-[#003CA6]/30 text-[#60c8f0] border-[#003CA6]' : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-white'}`}
          >
            📊 Quiz Results
          </button>

          <button
            onClick={async () => {
              setGeneratingOverview(true); setOverviewMsg('')
              const res = await fetch(`/api/lms/courses/${course.id}/generate-overview`, {
                method: 'POST',
              })
              const data = await res.json()
              setOverviewMsg(data.error ? `Error: ${data.error}` : `✓ Overview generated`)
              setGeneratingOverview(false)
            }}
            disabled={generatingOverview}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors bg-cyan-900/30 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 disabled:opacity-50"
          >
            {generatingOverview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Overview
          </button>
          {overviewMsg && <p className="text-xs text-center" style={{ color: overviewMsg.startsWith('Error') ? '#f87171' : '#86efac' }}>{overviewMsg}</p>}

          <button
            onClick={async () => {
              setAutoGenerating(true); setAutoGenMsg('')
              const res = await fetch('/api/lms/quizzes/auto-generate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: course.id }),
              })
              const data = await res.json()
              if (!data.error) {
                // Switch to course assessment view to see the generated questions
                setActiveLesson(null)
                setActiveView('course-quiz')
              }
              setAutoGenMsg(data.error ? `Error: ${data.error}` : `✓ ${data.generated} questions generated`)
              setAutoGenerating(false)
            }}
            disabled={autoGenerating}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors bg-[#003CA6]/15 text-[#00A3E0] border border-[#003CA6]/50 hover:bg-violet-900/50 disabled:opacity-50"
          >
            {autoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Generate Quiz
          </button>
          {autoGenMsg && <p className="text-xs text-center" style={{ color: autoGenMsg.startsWith('Error') ? '#f87171' : '#86efac' }}>{autoGenMsg}</p>}
          <button onClick={() => { setPublished(!published) }} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors ${published ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
            {published ? <><Globe className="w-4 h-4" /> Published</> : <><EyeOff className="w-4 h-4" /> Draft</>}
          </button>
          <button onClick={saveSettings} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2 bg-[#003CA6] hover:bg-[#0048CC] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {/* Right: lesson editor */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeLesson ? (
          <>
            <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-5">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)}
                  className="bg-transparent text-white font-semibold text-sm focus:outline-none min-w-0 flex-1" placeholder="Lesson title" />
                <div className="flex gap-1 flex-shrink-0">
                  {(['content', 'quiz', 'qr'] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${activeTab === t ? 'bg-[#003CA6] text-white' : 'text-gray-400 hover:text-white'}`}>
                      {t === 'qr' ? '📷 QR' : t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link href={`/lms/course/${course.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"><Eye className="w-4 h-4" /></Link>
                <button onClick={saveLesson} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003CA6] hover:bg-[#0048CC] disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                </button>
              </div>
            </div>
            {activeTab === 'content' ? (
              (() => {
                // Detect if this is a non-editable lesson type (video, scribe, pdf, etc.)
                let parsed: Record<string, unknown> | null = null
                try { parsed = JSON.parse(lessonContent) } catch {}
                const isVideo  = parsed?.__video  === true
                const isScribe = parsed?.__scribe === true
                const isPdf    = parsed?.__pdf    === true
                const isEmbed  = parsed?.__embed  === true
                const isUrl    = parsed?.__url    === true
                const isHtml   = parsed?.__html   === true
                const isStructured = isVideo || isScribe || isPdf || isEmbed || isUrl || isHtml

                if (isStructured) {
                  return (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="rounded-xl p-4 text-sm" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
                        <p className="text-gray-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                          {isVideo ? '🎬 Video Lesson' : isScribe ? '📖 Scribe Guide' : isPdf ? '📄 PDF' : isEmbed ? '🔗 Embed' : isUrl ? '🌐 URL' : '💻 HTML'}
                        </p>
                        <p className="text-white font-medium truncate">
                          {isVideo ? (parsed as any).url : isScribe ? (parsed as any).slides : isPdf ? (parsed as any).url : (parsed as any).url ?? '(content stored)'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#475569' }}>This lesson type is imported — edit via Import Content page</p>
                      </div>
                      {isVideo && (
                        <VideoMetricsPanel lessonId={activeLesson!.id} lessonTitle={activeLesson!.title} />
                      )}
                    </div>
                  )
                }

                return (
                  <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                    <textarea value={lessonContent} onChange={e => setLessonContent(e.target.value)}
                      placeholder="Write lesson content in Markdown..."
                      className="w-full sm:w-1/2 h-48 sm:h-full bg-gray-950 text-gray-300 text-sm p-6 resize-none focus:outline-none border-b sm:border-b-0 sm:border-r border-gray-800 font-mono leading-relaxed" />
                    <div className="w-full sm:w-1/2 overflow-y-auto p-6">
                      <article className="prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-code:text-[#00A3E0] max-w-none text-sm">
                        <ReactMarkdown>{lessonContent || '*Start writing to see a preview...*'}</ReactMarkdown>
                      </article>
                    </div>
                  </div>
                )
              })()
            ) : activeTab === 'qr' ? (
              <LessonQRPanel lessonId={activeLesson.id} lessonTitle={lessonTitle} />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <QuizEditor courseId={course.id} lessonId={activeLesson.id} />
              </div>
            )}
          </>
        ) : activeView === 'course-quiz' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-3">
              <span className="text-white font-semibold text-sm">📝 Course Assessment</span>
              <span className="text-xs text-gray-500">End-of-course quiz shown to learners after completing all lessons</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuizEditor courseId={course.id} lessonId={null} />
            </div>
          </div>
        ) : activeView === 'quiz-results' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-5 gap-3">
              <span className="text-white font-semibold text-sm">📊 Quiz Results</span>
              <span className="text-xs text-gray-500">All learner attempts — expand any row to see per-question answers</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuizResults courseId={course.id} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-lg">Select a lesson to edit</p>
              <p className="text-gray-600 text-sm mt-1">Or use the buttons below to manage quizzes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
