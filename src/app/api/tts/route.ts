import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Gemini TTS via raw API (SDK doesn't fully support audio modality yet)
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, voice = 'Aoede' } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const apiKey = process.env.GEMINI_API_KEY!

  // Try Gemini TTS models in order
  const ttsModels = ['gemini-2.5-flash-preview-tts', 'gemini-2.0-flash-preview-tts']

  for (const model of ttsModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        if (err.error?.code === 404 || err.error?.code === 400) continue // try next model
        throw new Error(err.error?.message || 'TTS failed')
      }

      const data = await res.json()
      const part = data.candidates?.[0]?.content?.parts?.[0]
      if (!part?.inlineData?.data) continue

      const audioBase64 = part.inlineData.data
      const mimeType = part.inlineData.mimeType || 'audio/pcm;rate=24000'

      return NextResponse.json({ audioBase64, mimeType })
    } catch (err: any) {
      if (ttsModels.indexOf(model) === ttsModels.length - 1) throw err
    }
  }

  return NextResponse.json({ error: 'TTS not available for your API key' }, { status: 503 })
}
