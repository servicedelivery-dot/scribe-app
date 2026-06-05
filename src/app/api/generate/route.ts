import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { generateWithRetry } from '@/lib/gemini'
import { db } from '@/lib/db'
import { contentItems, generatedContent } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { OutputFormat } from '@/lib/types'

const FORMAT_PROMPTS: Record<OutputFormat, string> = {
  course: `You are an expert instructional designer. Analyze the provided screenshots and notes, then create a complete course outline with:
- A compelling course title
- Course description (2-3 sentences)
- Learning objectives (3-5 bullet points)
- Modules (3-6 modules), each with:
  - Module title and description
  - 3-5 lessons per module with titles and brief descriptions
  - Key concepts covered
Format the output in clean markdown.`,

  guide: `You are a technical writer. Analyze the provided screenshots and notes, then create a clear step-by-step guide with:
- A descriptive title
- Brief introduction (what this guide covers and who it's for)
- Prerequisites (if any)
- Numbered steps with clear instructions, referencing the screenshots where relevant
- Tips and notes where helpful
- Summary
Format the output in clean markdown.`,

  article: `You are a content strategist. Analyze the provided screenshots and notes, then create a comprehensive knowledge base article with:
- A clear, searchable title
- TL;DR summary (2-3 sentences)
- Well-structured sections with headings
- Key concepts explained clearly
- Practical examples drawn from the screenshots
- Related topics to explore
Format the output in clean markdown.`,
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, format }: { projectId: string; format: OutputFormat } = await req.json()

  const items = await db.select().from(contentItems)
    .where(and(eq(contentItems.projectId, projectId), eq(contentItems.userId, userId)))
    .orderBy(asc(contentItems.orderIndex))

  if (!items.length) {
    return NextResponse.json({ error: 'No content items found. Add screenshots or notes first.' }, { status: 400 })
  }


  // Build parts array for Gemini
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = []

  parts.push({ text: FORMAT_PROMPTS[format] })
  parts.push({
    text: `I have ${items.length} content items (screenshots and notes) to transform into ${format === 'course' ? 'a course' : format === 'guide' ? 'a step-by-step guide' : 'a knowledge base article'}.`,
  })

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type === 'note' && item.content) {
      parts.push({ text: `[Item ${i + 1} - Note]: ${item.content}` })
    } else if (item.type === 'image' && item.publicUrl) {
      parts.push({ text: `[Item ${i + 1} - Screenshot]:` })
      try {
        const imgRes = await fetch(item.publicUrl, { headers: { 'Accept': 'image/*' } })
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
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

  parts.push({ text: 'Now create the content based on everything above.' })

  try {
    const body = await generateWithRetry(parts)

    const titleMatch = body.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : `${format.charAt(0).toUpperCase() + format.slice(1)} — ${new Date().toLocaleDateString()}`

    const [saved] = await db.insert(generatedContent).values({
      projectId,
      userId,
      format,
      title,
      body,
    }).returning()

    return NextResponse.json(saved)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
