'use client'

import { useState, useRef } from 'react'
import { Link2, X, Loader2, CheckCircle, AlertCircle, Sparkles, Image, FileText, ChevronRight } from 'lucide-react'
import type { ContentItem, GeneratedContent } from '@/lib/types'

interface Props {
  projectId: string
  onImported: (items: ContentItem[]) => void
  onGenerated?: (gen: GeneratedContent) => void
}

type Stage = 'idle' | 'running' | 'done' | 'error'

interface ProgressStep {
  id: string
  message: string
  status: 'done' | 'active' | 'pending'
}

export default function ScribeImport({ projectId, onImported, onGenerated }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [stage, setStage] = useState<Stage>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [generatedTitle, setGeneratedTitle] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  function addLog(msg: string) {
    setLogs(prev => [...prev, msg])
  }

  async function handleRun() {
    if (!input.trim()) return
    setStage('running')
    setLogs([])
    setError('')
    setImportedCount(0)
    setGeneratedTitle('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/scribe-import/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, projectId, autoGenerate }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Import failed')
        setStage('error')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue
          const lines = eventBlock.split('\n')
          const eventType = lines.find(l => l.startsWith('event:'))?.replace('event:', '').trim()
          const dataLine = lines.find(l => l.startsWith('data:'))?.replace('data:', '').trim()
          if (!dataLine) continue

          try {
            const data = JSON.parse(dataLine)
            if (eventType === 'progress') addLog(data.message)
            if (eventType === 'imported') {
              addLog(data.message)
              setImportedCount(data.items?.length ?? 0)
              if (data.items) onImported(data.items)
            }
            if (eventType === 'generated') {
              addLog(data.message)
              setGeneratedTitle(data.generated?.title ?? '')
              if (data.generated && onGenerated) onGenerated(data.generated)
            }
            if (eventType === 'done') setStage('done')
            if (eventType === 'error') {
              setError(data.message)
              setStage('error')
            }
          } catch {}
        }
      }

      if (stage !== 'error') setStage('done')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Import failed')
        setStage('error')
      }
    }
  }

  function close() {
    abortRef.current?.abort()
    setOpen(false)
    setStage('idle')
    setLogs([])
    setError('')
    setInput('')
  }

  const isRunning = stage === 'running'
  const isDone = stage === 'done'
  const isError = stage === 'error'

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all border border-dashed"
        style={{ background: 'rgba(0,60,166,0.08)', borderColor: '#1e3a6e', color: '#64748b' }}>
        <Link2 className="w-4 h-4" />
        Import from Scribe
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border w-full max-w-lg" style={{ background: '#080f1e', borderColor: '#1e3a6e' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e3a6e' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,60,166,0.3)' }}>
                  <Link2 className="w-4 h-4" style={{ color: '#00A3E0' }} />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Import from Scribe</h2>
                  <p className="text-xs" style={{ color: '#64748b' }}>Paste an iframe or URL — we do the rest</p>
                </div>
              </div>
              <button onClick={close} className="text-gray-600 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">

              {/* Input */}
              {stage === 'idle' && (
                <>
                  <div>
                    <label className="text-xs uppercase tracking-wide block mb-2" style={{ color: '#64748b' }}>
                      Paste Scribe iframe or URL
                    </label>
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      rows={4}
                      placeholder={`Paste either:\n\n<iframe src="https://scribehow.com/embed/..." ...></iframe>\n\nor just the URL:\nhttps://scribehow.com/shared/...`}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono focus:outline-none resize-none"
                      style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}
                    />
                  </div>

                  {/* Auto-generate toggle */}
                  <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer" style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}>
                    <div
                      onClick={() => setAutoGenerate(!autoGenerate)}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ background: autoGenerate ? '#003CA6' : '#1e293b' }}
                    >
                      <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                        style={{ transform: autoGenerate ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Auto-generate course after import</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>AI reads all screenshots and creates a course outline automatically</p>
                    </div>
                  </label>

                  {/* Flow preview */}
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                    {[
                      { icon: <Link2 className="w-3.5 h-3.5" />, label: 'Parse URL' },
                      { icon: <Image className="w-3.5 h-3.5" />, label: 'Extract screenshots' },
                      { icon: <FileText className="w-3.5 h-3.5" />, label: 'Save to project' },
                      ...(autoGenerate ? [{ icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Generate course' }] : []),
                    ].map((step, i, arr) => (
                      <span key={i} className="flex items-center gap-2">
                        <span className="flex items-center gap-1" style={{ color: '#00A3E0' }}>{step.icon} {step.label}</span>
                        {i < arr.length - 1 && <ChevronRight className="w-3 h-3" />}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={handleRun}
                    disabled={!input.trim()}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: '#003CA6' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Import & {autoGenerate ? 'Generate Course' : 'Save Screenshots'}
                  </button>
                </>
              )}

              {/* Progress */}
              {(isRunning || isDone || isError) && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden" style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}>
                    <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: '#1e3a6e' }}>
                      {isRunning && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00A3E0' }} />}
                      {isDone && <div className="w-2 h-2 rounded-full bg-green-400" />}
                      {isError && <div className="w-2 h-2 rounded-full bg-red-500" />}
                      <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                        {isRunning ? 'Running...' : isDone ? 'Complete' : 'Failed'}
                      </span>
                    </div>
                    <div className="p-4 space-y-1.5 max-h-52 overflow-y-auto">
                      {logs.map((log, i) => (
                        <p key={i} className="text-xs font-mono" style={{ color: i === logs.length - 1 && isRunning ? '#e2e8f0' : '#64748b' }}>
                          {log}
                        </p>
                      ))}
                      {isRunning && (
                        <p className="text-xs font-mono flex items-center gap-1" style={{ color: '#00A3E0' }}>
                          <Loader2 className="w-3 h-3 animate-spin" /> Working...
                        </p>
                      )}
                    </div>
                  </div>

                  {isError && (
                    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {isDone && (
                    <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">Import complete</span>
                      </div>
                      <div className="text-xs space-y-1" style={{ color: '#94a3b8' }}>
                        <p>📸 {importedCount} items saved to your project</p>
                        {generatedTitle && <p>🎓 Course created: <span className="text-white">"{generatedTitle}"</span></p>}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {isError && (
                      <button onClick={() => { setStage('idle'); setLogs([]) }}
                        className="flex-1 py-2 rounded-lg text-sm text-gray-300 transition-colors"
                        style={{ background: '#1e293b' }}>
                        Try again
                      </button>
                    )}
                    <button onClick={close}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ background: isDone ? '#003CA6' : '#1e293b' }}>
                      {isDone ? 'Done' : 'Close'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
