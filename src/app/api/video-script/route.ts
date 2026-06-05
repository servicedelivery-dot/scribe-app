import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { generateWithRetry } from '@/lib/gemini'
import { db } from '@/lib/db'
import { contentItems } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export interface VideoScript {
  title: string
  intro: string
  segments: { itemIndex: number; type: 'image' | 'note'; text: string }[]
  outro: string
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await req.json()

  const items = await db.select().from(contentItems)
    .where(and(eq(contentItems.projectId, projectId), eq(contentItems.userId, userId)))
    .orderBy(asc(contentItems.orderIndex))

  if (!items.length) {
    return NextResponse.json({ error: 'No content items found.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = []

  parts.push({
    text: `You are creating a voice-over narration script for a video presentation.
The video will show a series of screenshots and notes as slides.
Write natural, engaging spoken narration — as if presenting to an audience.
Keep each segment to 2-4 sentences (about 10-20 seconds of speech).

Return ONLY valid JSON in this exact format:
{
  "title": "video title",
  "intro": "opening narration (1-2 sentences)",
  "segments": [
    { "itemIndex": 0, "text": "narration for this slide" },
    ...one entry per item below...
  ],
  "outro": "closing narration (1-2 sentences)"
}`,
  })

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type === 'note' && item.content) {
      parts.push({ text: `[Slide ${i + 1} - Note]: ${item.content}` })
    } else if (item.type === 'image' && item.publicUrl) {
      parts.push({ text: `[Slide ${i + 1} - Screenshot]:` })
      try {
        const imgRes = await fetch(item.publicUrl, { headers: { 'Accept': 'image/*' } })
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        // Only pass to Gemini if it's actually an image
        if (mimeType.startsWith('image/')) {
          const imgBuffer = await imgRes.arrayBuffer()
          const base64 = Buffer.from(imgBuffer).toString('base64')
          parts.push({ inlineData: { data: base64, mimeType } })
        } else {
          parts.push({ text: `[Image at: ${item.publicUrl}]` })
        }
      } catch {
        parts.push({ text: `[Screenshot ${i + 1}]` })
      }
    }
  }

  parts.push({ text: 'Generate the voice-over script JSON now.' })

  try {
    let text = (await generateWithRetry(parts)).trim()
    // Strip markdown code fences if present
    text = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '')
    const script: VideoScript = JSON.parse(text)
    // Attach item types
    script.segments = script.segments.map((seg, i) => ({
      ...seg,
      type: items[seg.itemIndex]?.type ?? 'note',
    }))
    return NextResponse.json({ script, items: items.map(it => ({ id: it.id, type: it.type, publicUrl: it.publicUrl })) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Script generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
