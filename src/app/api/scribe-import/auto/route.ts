import { auth } from '@clerk/nextjs/server'
import { UTApi } from 'uploadthing/server'
import { db } from '@/lib/db'
import { contentItems, generatedContent } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateWithRetry } from '@/lib/gemini'

const utapi = new UTApi()

function extractScribeUrl(input: string): string | null {
  // Accept: full iframe HTML, embed URL, shared URL, viewer URL
  const iframeSrc = input.match(/src=["']([^"']+scribehow\.com[^"']+)["']/)?.[1]
  if (iframeSrc) return iframeSrc

  const directUrl = input.match(/(https?:\/\/scribehow\.com\/[^\s"'<>]+)/)?.[1]
  if (directUrl) return directUrl

  return null
}

function normaliseToEmbed(url: string): string {
  return url
    .replace('scribehow.com/shared/', 'scribehow.com/embed/')
    .replace('scribehow.com/viewer/', 'scribehow.com/embed/')
}

async function launchBrowser() {
  const puppeteer = await import('puppeteer-core')

  // Windows local Chrome
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]

  let executablePath = chromePaths[0]
  for (const p of chromePaths) {
    try {
      const fs = await import('fs')
      if (fs.existsSync(p)) { executablePath = p; break }
    } catch {}
  }

  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { input, projectId, autoGenerate } = await req.json()

  const scribeUrl = extractScribeUrl(input)
  if (!scribeUrl) {
    return new Response(
      JSON.stringify({ error: 'Could not find a Scribe URL. Paste the full iframe code or the guide URL.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const embedUrl = normaliseToEmbed(scribeUrl)

  // Use Server-Sent Events for real-time progress
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  function send(event: string, data: object) {
    writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  // Run import async
  ;(async () => {
    let browser: any = null
    try {
      send('progress', { step: 'browser', message: '🌐 Launching browser...' })

      browser = await launchBrowser()
      const page = await browser.newPage()

      const capturedUrls: string[] = []

      // Intercept ALL requests to capture colony-recorder image URLs
      await page.setRequestInterception(true)
      page.on('request', (req: any) => {
        const url = req.url()
        if (url.includes('colony-recorder.s3') && url.includes('screenshot')) {
          if (!capturedUrls.includes(url)) capturedUrls.push(url)
        }
        req.continue()
      })

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      send('progress', { step: 'loading', message: `📖 Loading Scribe guide...` })
      await page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // Wait for first images to appear
      await page.waitForFunction(
        () => document.querySelectorAll('img[src*="colony-recorder"]').length > 0,
        { timeout: 10000 }
      ).catch(() => {})

      send('progress', { step: 'scrolling', message: '📜 Scrolling to load all screenshots...' })

      // Slow scroll to trigger ALL lazy-loaded images
      const scrollHeight: number = await page.evaluate(() => document.body.scrollHeight)
      const steps = Math.ceil(scrollHeight / 500)
      for (let i = 0; i <= steps; i++) {
        await page.evaluate((step: number) => window.scrollTo(0, step * 500), i)
        await new Promise(r => setTimeout(r, 300))
      }
      await new Promise(r => setTimeout(r, 2000))

      // Also grab img src directly from DOM
      const domImageUrls: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .map((img: any) => img.src || img.dataset.src || '')
          .filter((src: string) => src.includes('colony-recorder.s3') && src.includes('screenshot'))
      )
      domImageUrls.forEach(u => { if (!capturedUrls.includes(u)) capturedUrls.push(u) })

      // Get guide title + step text
      const guideData: { title: string; steps: string[] } = await page.evaluate(() => {
        const title = document.title.replace(/\s*\|.*$/, '').trim()
        const stepTexts = Array.from(
          document.querySelectorAll('[data-step-index], .step, [class*="step"], [class*="Step"]')
        )
          .map((el: any) => el.innerText?.trim())
          .filter(Boolean)
          .slice(0, 50)
        return { title, steps: stepTexts }
      })

      await browser.close()
      browser = null

      if (!capturedUrls.length) {
        send('error', { message: 'No screenshots found. The guide may be private or still loading. Try the manual paste method.' })
        writer.close()
        return
      }

      send('progress', {
        step: 'downloading',
        message: `📥 Found ${capturedUrls.length} screenshots — downloading...`,
        total: capturedUrls.length,
      })

      // Get existing count for order_index
      const existing = await db.select().from(contentItems).where(eq(contentItems.projectId, projectId))
      let orderIndex = existing.length
      const savedItems: any[] = []

      for (let i = 0; i < capturedUrls.length; i++) {
        const imgUrl = capturedUrls[i]
        send('progress', {
          step: 'uploading',
          message: `⬆️ Saving screenshot ${i + 1} of ${capturedUrls.length}...`,
          current: i + 1,
          total: capturedUrls.length,
        })

        try {
          const res = await fetch(imgUrl, {
            headers: {
              'Referer': 'https://scribehow.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          })
          if (!res.ok) continue

          const buffer = await res.arrayBuffer()
          const mimeType = res.headers.get('content-type') || 'image/webp'
          const ext = mimeType.includes('webp') ? 'webp' : 'jpg'
          const file = new File([buffer], `scribe-${i + 1}.${ext}`, { type: mimeType })

          const upload = await utapi.uploadFiles(file)
          if (upload.error) continue

          const [item] = await db.insert(contentItems).values({
            projectId,
            userId,
            type: 'image',
            storageKey: upload.data.key,
            publicUrl: upload.data.ufsUrl,
            orderIndex,
          }).returning()

          savedItems.push(item)
          orderIndex++
        } catch { continue }
      }

      // Add a note with guide title + step descriptions
      if (guideData.title) {
        const noteLines = [
          `Source: ${guideData.title}`,
          `Imported from: ${scribeUrl}`,
          guideData.steps.length ? '\nSteps:\n' + guideData.steps.join('\n') : '',
        ].filter(Boolean).join('\n')

        const [noteItem] = await db.insert(contentItems).values({
          projectId, userId, type: 'note', content: noteLines, orderIndex,
        }).returning()
        savedItems.push(noteItem)
      }

      send('imported', {
        message: `✅ ${savedItems.length} items saved!`,
        items: savedItems,
        guideTitle: guideData.title,
      })

      // Auto-generate course if requested
      if (autoGenerate && savedItems.length > 1) {
        send('progress', { step: 'generating', message: '🤖 Generating course with AI...' })

        try {
          // Build parts for Gemini
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parts: any[] = []
          parts.push({
            text: `You are an expert instructional designer. Analyze the provided screenshots from a guide titled "${guideData.title}" and create a complete course outline with modules, lessons, and learning objectives. Format in clean markdown.`,
          })

          const imageItems = savedItems.filter((it: any) => it.type === 'image')
          for (let i = 0; i < Math.min(imageItems.length, 10); i++) {
            const item = imageItems[i]
            parts.push({ text: `[Step ${i + 1} screenshot]:` })
            try {
              const imgRes = await fetch(item.publicUrl, { headers: { Accept: 'image/*' } })
              const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
              if (mimeType.startsWith('image/')) {
                const buf = await imgRes.arrayBuffer()
                parts.push({ inlineData: { data: Buffer.from(buf).toString('base64'), mimeType } })
              }
            } catch {}
          }

          const noteItem = savedItems.find((it: any) => it.type === 'note')
          if (noteItem) parts.push({ text: noteItem.content })
          parts.push({ text: 'Now create a full course outline.' })

          const body = await generateWithRetry(parts)
          const titleMatch = body.match(/^#\s+(.+)$/m)
          const title = titleMatch?.[1] ?? guideData.title ?? 'Generated Course'

          const [gen] = await db.insert(generatedContent).values({
            projectId, userId, format: 'course', title, body,
          }).returning()

          send('generated', {
            message: `🎓 Course created: "${title}"`,
            generated: gen,
          })
        } catch (err: any) {
          send('progress', { step: 'generating', message: `⚠️ AI generation failed: ${err.message}. You can generate manually.` })
        }
      }

      send('done', { message: 'All done!' })
    } catch (err: any) {
      if (browser) { try { await browser.close() } catch {} }
      send('error', { message: err.message || 'Import failed' })
    } finally {
      writer.close()
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
