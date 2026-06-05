'use client'

import { useState, useRef, useCallback } from 'react'
import { Video, X, Download, Loader2, Play, CheckCircle, Mic } from 'lucide-react'
import type { VideoScript } from '@/app/api/video-script/route'

interface Props { projectId: string; projectTitle: string }
type Stage = 'idle' | 'generating-script' | 'review' | 'generating-audio' | 'encoding' | 'done' | 'error'
interface ItemRef { id: string; type: 'image' | 'note'; publicUrl: string | null }

const CANVAS_W = 1280
const CANVAS_H = 720

// Convert raw PCM (24kHz, 16-bit, mono) from Gemini TTS to WAV ArrayBuffer
function pcmToWav(pcmBase64: string, sampleRate = 24000): ArrayBuffer {
  const pcmData = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0))
  const numSamples = pcmData.byteLength / 2
  const wavBuffer = new ArrayBuffer(44 + pcmData.byteLength)
  const view = new DataView(wavBuffer)
  const writeStr = (offset: number, str: string) => str.split('').forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + pcmData.byteLength, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)        // chunk size
  view.setUint16(20, 1, true)         // PCM
  view.setUint16(22, 1, true)         // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)         // block align
  view.setUint16(34, 16, true)        // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, pcmData.byteLength, true)
  new Uint8Array(wavBuffer, 44).set(pcmData)
  return wavBuffer
}

export default function VideoOverview({ projectId, projectTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [script, setScript] = useState<VideoScript | null>(null)
  const [items, setItems] = useState<ItemRef[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [audioAvailable, setAudioAvailable] = useState(true)
  // Add to course
  const [courses, setCourses] = useState<{id:string;title:string;emoji:string}[]>([])
  const [modules, setModules] = useState<{id:string;title:string;courseId:string}[]>([])
  const [addCourseId, setAddCourseId] = useState('')
  const [addModuleId, setAddModuleId] = useState('')
  const [addingToCourse, setAddingToCourse] = useState(false)
  const [addedMsg, setAddedMsg] = useState('')
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch courses when modal opens
  async function loadCourses() {
    const [c, m] = await Promise.all([
      fetch('/api/lms/courses').then(r => r.json()).catch(() => []),
      fetch('/api/lms/modules').then(r => r.json()).catch(() => []),
    ])
    setCourses(Array.isArray(c) ? c : [])
    setModules(Array.isArray(m) ? m : [])
  }

  // Upload blob + create video lesson
  async function addToCourse() {
    if (!addCourseId || !addModuleId || !videoBlob) return
    setAddingToCourse(true)
    setAddedMsg('')
    try {
      // Upload via UploadThing
      const formData = new FormData()
      formData.append('file', videoBlob, `${projectTitle.replace(/\s+/g,'-')}-overview.webm`)
      let uploadedUrl = ''
      try {
        const up = await fetch('/api/uploadthing', { method: 'POST', body: formData })
        const upData = await up.json()
        uploadedUrl = upData?.url || upData?.[0]?.url || ''
      } catch { /* upload failed, use object URL as fallback */ uploadedUrl = videoUrl || '' }

      // Create lesson
      const res = await fetch('/api/lms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          title: `${projectTitle} — Video Overview`,
          courseId: addCourseId,
          moduleId: addModuleId,
          content: '',
          fileUrl: uploadedUrl,
          fileName: `${projectTitle}-overview.webm`,
          generateQuiz: false,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Log to activity
      await fetch('/api/lms/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'video_created',
          entityType: 'lesson',
          entityId: data.lesson?.id,
          entityName: `${projectTitle} — Video Overview`,
        }),
      }).catch(() => {})

      setAddedMsg(`✓ Added to course as a video lesson!`)
    } catch (e: unknown) {
      setAddedMsg(`Error: ${e instanceof Error ? e.message : 'Failed'}`)
    }
    setAddingToCourse(false)
  }

  // ── Script ──────────────────────────────────────────────────────────────────
  async function generateScript() {
    setStage('generating-script')
    setError('')
    try {
      const res = await fetch('/api/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setScript(data.script)
      setItems(data.items)
      setStage('review')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate script')
      setStage('error')
    }
  }

  function updateSegmentText(index: number, text: string) {
    if (!script) return
    setScript({ ...script, segments: script.segments.map((s, i) => i === index ? { ...s, text } : s) })
  }

  // ── Canvas rendering ────────────────────────────────────────────────────────
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(' '); let line = '', cy = y
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, cy); line = word + ' '; cy += lh }
      else line = test
    }
    if (line.trim()) ctx.fillText(line.trim(), x, cy)
  }

  const renderTitleSlide = useCallback((ctx: CanvasRenderingContext2D, title: string) => {
    const g = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H)
    g.addColorStop(0, '#001228'); g.addColorStop(1, '#001f5c')
    ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#003CA6'; ctx.fillRect(0, CANVAS_H - 8, CANVAS_W, 8)
    ctx.fillStyle = '#00A3E0'; ctx.font = 'bold 58px DM Sans, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(title.slice(0, 60), CANVAS_W / 2, CANVAS_H / 2 - 20)
    ctx.fillStyle = '#475569'; ctx.font = '26px DM Sans, sans-serif'
    ctx.fillText(projectTitle, CANVAS_W / 2, CANVAS_H / 2 + 40)
  }, [projectTitle])

  const renderSlide = useCallback(async (
    ctx: CanvasRenderingContext2D,
    item: ItemRef | null,
    captionText: string,
    label: string,
  ) => {
    ctx.fillStyle = '#010a18'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    if (item?.type === 'image' && item.publicUrl) {
      await new Promise<void>(resolve => {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          const scale = Math.min((CANVAS_W - 80) / img.width, (CANVAS_H - 160) / img.height)
          const w = img.width * scale, h = img.height * scale
          ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h - 90) / 2, w, h)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = item.publicUrl!
      })
    } else {
      ctx.fillStyle = '#001f5c'
      ctx.beginPath(); ctx.roundRect(80, 80, CANVAS_W - 160, CANVAS_H - 220, 16); ctx.fill()
      ctx.fillStyle = '#00A3E0'; ctx.font = 'bold 26px DM Sans,sans-serif'; ctx.textAlign = 'center'
      wrapText(ctx, captionText, CANVAS_W / 2, CANVAS_H / 2 - 30, CANVAS_W - 250, 40)
    }

    // Bottom bar
    ctx.fillStyle = 'rgba(0,10,25,0.88)'; ctx.fillRect(0, CANVAS_H - 120, CANVAS_W, 120)
    ctx.fillStyle = '#003CA6'; ctx.fillRect(0, CANVAS_H - 4, CANVAS_W, 4)

    // Label
    ctx.fillStyle = '#00A3E0'; ctx.font = 'bold 15px DM Sans,sans-serif'; ctx.textAlign = 'left'
    ctx.fillText(label, 40, CANVAS_H - 88)

    // Caption
    ctx.fillStyle = '#e2e8f0'; ctx.font = '19px DM Sans,sans-serif'; ctx.textAlign = 'center'
    wrapText(ctx, captionText, CANVAS_W / 2, CANVAS_H - 65, CANVAS_W - 100, 28)

    // Title
    ctx.fillStyle = '#334155'; ctx.font = '13px DM Sans,sans-serif'; ctx.textAlign = 'right'
    ctx.fillText(projectTitle, CANVAS_W - 40, CANVAS_H - 10)
  }, [projectTitle, wrapText])

  // ── TTS helper ──────────────────────────────────────────────────────────────
  async function fetchTTS(text: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return null
      const { audioBase64, mimeType } = await res.json()
      if (!audioBase64) return null
      // If PCM, wrap in WAV
      if (mimeType?.includes('pcm')) return pcmToWav(audioBase64)
      // Otherwise decode directly
      const binary = atob(audioBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes.buffer
    } catch {
      return null
    }
  }

  // ── Encode video ─────────────────────────────────────────────────────────────
  async function encodeVideo() {
    if (!script || !canvasRef.current) return
    setStage('generating-audio')
    setProgress('Generating AI voice narration...')

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    // 1. Pre-generate ALL audio in parallel batches of 3 (avoids rate-limit, ~3× faster)
    const allTexts = [
      script.intro,
      ...script.segments.map(s => s.text),
      script.outro,
    ]

    setProgress(`🎙️ Generating ${allTexts.length} voice clips in parallel...`)
    const BATCH = 3
    const audioBuffers: (ArrayBuffer | null)[] = new Array(allTexts.length).fill(null)
    for (let i = 0; i < allTexts.length; i += BATCH) {
      const batch = allTexts.slice(i, i + BATCH)
      setProgress(`🎙️ Generating voice ${i + 1}–${Math.min(i + BATCH, allTexts.length)} of ${allTexts.length}...`)
      const results = await Promise.all(batch.map(t => fetchTTS(t)))
      results.forEach((buf, j) => { audioBuffers[i + j] = buf })
    }
    if (!audioBuffers[0]) setAudioAvailable(false)

    const hasAudio = audioBuffers.some(b => b !== null)
    setStage('encoding')
    setProgress('Starting video encoder...')

    if (!('VideoEncoder' in window)) {
      setError('VideoEncoder not supported. Please use Chrome 94+.')
      setStage('error')
      return
    }

    const { Muxer, ArrayBufferTarget } = await import('webm-muxer')

    const target = new ArrayBufferTarget()
    const muxer = new Muxer({
      target,
      video: { codec: 'V_VP9', width: CANVAS_W, height: CANVAS_H, frameRate: 1 },
      ...(hasAudio ? { audio: { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 1 } } : {}),
    })

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: console.error,
    })
    videoEncoder.configure({ codec: 'vp09.00.10.08', width: CANVAS_W, height: CANVAS_H, bitrate: 2_500_000, framerate: 1 })

    let audioEncoder: AudioEncoder | null = null

    if (hasAudio && 'AudioEncoder' in window) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: console.error,
      })
      audioEncoder.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000 })
    }

    let videoTimestamp = 0   // microseconds
    let audioTimestamp = 0   // microseconds

    const encodeVideoFrame = async (keyFrame = false) => {
      const frame = new VideoFrame(canvas, { timestamp: videoTimestamp })
      videoEncoder.encode(frame, { keyFrame })
      frame.close()
    }

    const encodeAudioSegment = async (wavBuffer: ArrayBuffer | null) => {
      if (!audioEncoder || !wavBuffer) {
        // silent: advance audio timestamp by video segment duration
        audioTimestamp = videoTimestamp
        return
      }
      try {
        // Decode WAV using offline audio context
        const fullCtx = new OfflineAudioContext(1, 48000 * 30, 48000)
        const decoded = await fullCtx.decodeAudioData(wavBuffer.slice(0))
        const data = decoded.getChannelData(0)

        // Re-sample to 48kHz if needed
        let samples = data
        if (decoded.sampleRate !== 48000) {
          const ratio = decoded.sampleRate / 48000
          const newLen = Math.floor(data.length / ratio)
          const resampled = new Float32Array(newLen)
          for (let i = 0; i < newLen; i++) resampled[i] = data[Math.floor(i * ratio)]
          samples = resampled
        }

        // Encode in 960-sample Opus frames
        const frameSize = 960
        for (let offset = 0; offset < samples.length; offset += frameSize) {
          const chunk = samples.slice(offset, offset + frameSize)
          const padded = chunk.length < frameSize ? new Float32Array(frameSize) : chunk
          if (chunk.length < frameSize) padded.set(chunk)

          const aFrame = new AudioData({
            format: 'f32',
            sampleRate: 48000,
            numberOfFrames: frameSize,
            numberOfChannels: 1,
            timestamp: audioTimestamp,
            data: padded,
          })
          audioEncoder.encode(aFrame)
          aFrame.close()
          audioTimestamp += Math.round((frameSize / 48000) * 1_000_000)
        }

        // Align video timestamp to end of audio
        videoTimestamp = audioTimestamp
      } catch {
        videoTimestamp += 5_000_000
        audioTimestamp = videoTimestamp
      }
    }

    // ── Encode: frame first, THEN audio — so each slide is visible when its narration starts ──

    // Title slide
    setProgress('Rendering title slide...')
    renderTitleSlide(ctx, script.title)
    await encodeVideoFrame(true)            // place frame at ts=0 (keyframe)
    await encodeAudioSegment(audioBuffers[0]) // intro audio advances timestamp to end of intro

    // Each segment: show slide → speak narration
    for (let i = 0; i < script.segments.length; i++) {
      const seg = script.segments[i]
      const item = items[seg.itemIndex] ?? null
      setProgress(`Rendering slide ${i + 1} of ${script.segments.length}...`)
      await renderSlide(ctx, item, seg.text, `Slide ${i + 1} of ${script.segments.length}`)
      await encodeVideoFrame(false)                   // slide appears exactly when its audio starts
      await encodeAudioSegment(audioBuffers[i + 1])   // narrate, advance timestamp
    }

    // Outro slide
    setProgress('Rendering outro...')
    ctx.fillStyle = '#010a18'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#003CA6'; ctx.fillRect(0, CANVAS_H - 6, CANVAS_W, 6)
    ctx.fillStyle = '#00A3E0'; ctx.font = 'bold 52px DM Sans,sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Thank you', CANVAS_W / 2, CANVAS_H / 2 - 20)
    ctx.fillStyle = '#475569'; ctx.font = '24px sans-serif'
    ctx.fillText(projectTitle, CANVAS_W / 2, CANVAS_H / 2 + 40)
    await encodeVideoFrame(true)                                          // outro frame
    await encodeAudioSegment(audioBuffers[audioBuffers.length - 1])      // outro narration

    setProgress('Finalising...')
    await videoEncoder.flush()
    if (audioEncoder) await audioEncoder.flush()
    muxer.finalize()

    const blob = new Blob([target.buffer], { type: 'video/webm' })
    setVideoBlob(blob)
    setVideoUrl(URL.createObjectURL(blob))
    setStage('done')
    // Log video creation to activity feed
    fetch('/api/lms/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'video_created', entityType: 'project', entityId: projectId, entityName: projectTitle }),
    }).catch(() => {})
  }

  function downloadVideo() {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `${projectTitle.replace(/\s+/g, '-').toLowerCase()}-overview.webm`
    a.click()
  }

  function reset() { setStage('idle'); setScript(null); setVideoUrl(null); setError(''); setProgress('') }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors border"
        style={{ background: 'rgba(0,60,166,0.08)', borderColor: '#1e3a6e', color: '#64748b' }}>
        <Video className="w-4 h-4" /> Video Overview
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ background: '#080f1e', borderColor: '#1e3a6e' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#1e3a6e' }}>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5" style={{ color: '#00A3E0' }} />
                <h2 className="font-semibold text-white">Video Overview</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,60,166,0.3)', color: '#00A3E0' }}>
                  AI voice + no mic
                </span>
              </div>
              <button onClick={() => { reset(); setOpen(false) }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="hidden" />

            <div className="p-5 space-y-5">

              {stage === 'idle' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,60,166,0.2)' }}>
                    <Video className="w-8 h-8" style={{ color: '#00A3E0' }} />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Create a Video Overview</h3>
                  <p className="text-sm mb-1" style={{ color: '#64748b' }}>
                    AI writes the narration script, generates a real voice (Gemini TTS), renders slides, and exports instantly.
                  </p>
                  <div className="flex justify-center gap-4 text-xs my-6" style={{ color: '#475569' }}>
                    {[['🤖', 'AI narration script'], ['🎙️', 'Gemini TTS voice'], ['🎬', 'Instant export'], ['⬇️', 'Download .webm']].map(([icon, label]) => (
                      <span key={label}>{icon} {label}</span>
                    ))}
                  </div>
                  <button onClick={generateScript} className="px-6 py-2.5 rounded-xl font-medium text-white transition-colors" style={{ background: '#003CA6' }}>
                    Generate Script
                  </button>
                </div>
              )}

              {stage === 'generating-script' && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#00A3E0' }} />
                  <p style={{ color: '#64748b' }}>Writing narration script...</p>
                </div>
              )}

              {stage === 'review' && script && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{script.title}</h3>
                    <p className="text-xs mt-1" style={{ color: '#64748b' }}>Review the script — AI voice will read each segment aloud</p>
                  </div>

                  {[{ label: 'Intro', value: script.intro, onChange: (v: string) => setScript({ ...script, intro: v }) }].map(f => (
                    <div key={f.label} className="rounded-xl p-4" style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}>
                      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#00A3E0' }}>{f.label}</p>
                      <textarea value={f.value} onChange={e => f.onChange(e.target.value)} rows={2}
                        className="w-full bg-transparent text-sm text-gray-300 resize-none focus:outline-none" />
                    </div>
                  ))}

                  <div className="space-y-2">
                    {script.segments.map((seg, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}>
                        <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-2" style={{ background: '#1e3a6e', color: '#94a3b8' }}>
                          Slide {i + 1} — {seg.type}
                        </span>
                        <textarea value={seg.text} onChange={e => updateSegmentText(i, e.target.value)} rows={2}
                          className="w-full bg-transparent text-sm text-gray-300 resize-none focus:outline-none" />
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl p-4" style={{ background: '#040d1a', border: '1px solid #1e3a6e' }}>
                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#00A3E0' }}>Outro</p>
                    <textarea value={script.outro} onChange={e => setScript({ ...script, outro: e.target.value })} rows={2}
                      className="w-full bg-transparent text-sm text-gray-300 resize-none focus:outline-none" />
                  </div>

                  <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(0,163,224,0.08)', border: '1px solid rgba(0,163,224,0.2)', color: '#7dd3fc' }}>
                    🎙️ Each segment will be voiced by Gemini TTS (Aoede voice) — no microphone needed. If TTS is unavailable, captions will be used instead.
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={reset} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors" style={{ background: '#1e293b' }}>
                      Regenerate
                    </button>
                    <button onClick={encodeVideo}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-white transition-colors"
                      style={{ background: '#003CA6' }}>
                      <Play className="w-4 h-4" /> Generate Video
                    </button>
                  </div>
                </div>
              )}

              {(stage === 'generating-audio' || stage === 'encoding') && (
                <div className="text-center py-10 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: '#00A3E0' }} />
                  <p className="text-white font-medium">{progress}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {stage === 'generating-audio' ? 'Calling Gemini TTS for each slide...' : 'Encoding video frames in background...'}
                  </p>
                </div>
              )}

              {stage === 'done' && videoUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Video ready{audioAvailable ? ' with AI voice' : ' (captions only)'}!</span>
                  </div>
                  <video src={videoUrl} controls className="w-full rounded-xl border" style={{ borderColor: '#1e3a6e' }} />
                  <div className="flex gap-3">
                    <button onClick={reset} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors" style={{ background: '#1e293b' }}>
                      Make another
                    </button>
                    <button onClick={downloadVideo}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-white transition-colors"
                      style={{ background: '#003CA6' }}>
                      <Download className="w-4 h-4" /> Download .webm
                    </button>
                  </div>

                  {/* ── Add to Course ── */}
                  <div className="rounded-xl p-4 space-y-3" style={{ background: '#091525', border: '1px solid #1e3a6e' }}>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      📚 Add to a Course
                    </p>
                    <p className="text-xs" style={{ color: '#475569' }}>
                      Save this video as a lesson — learners can watch it with progress tracking.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#64748b' }}>Course</label>
                        <select value={addCourseId}
                          onChange={e => { setAddCourseId(e.target.value); setAddModuleId('') }}
                          onFocus={loadCourses}
                          className="w-full px-2 py-2 text-xs text-white rounded-lg focus:outline-none"
                          style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
                          <option value="">— pick course —</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs block mb-1" style={{ color: '#64748b' }}>Module</label>
                        <select value={addModuleId} onChange={e => setAddModuleId(e.target.value)}
                          className="w-full px-2 py-2 text-xs text-white rounded-lg focus:outline-none"
                          style={{ background: '#0d1b2e', border: '1px solid #1e3a6e' }}>
                          <option value="">— pick module —</option>
                          {modules.filter(m => m.courseId === addCourseId).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={addToCourse} disabled={!addCourseId || !addModuleId || addingToCourse}
                      className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: '#003CA6' }}>
                      {addingToCourse ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : '📥 Add Video to Course'}
                    </button>
                    {addedMsg && (
                      <p className="text-xs text-center" style={{ color: addedMsg.startsWith('Error') ? '#f87171' : '#86efac' }}>
                        {addedMsg}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-center" style={{ color: '#334155' }}>
                    .webm plays in Chrome, Firefox, Edge, VLC. Convert to .mp4 with <a href="https://www.handbrake.fr" target="_blank" className="underline" style={{ color: '#00A3E0' }}>Handbrake</a>.
                  </p>
                </div>
              )}

              {stage === 'error' && (
                <div className="space-y-4">
                  <div className="rounded-xl p-4 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {error}
                  </div>
                  <button onClick={reset} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors" style={{ background: '#1e293b' }}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
