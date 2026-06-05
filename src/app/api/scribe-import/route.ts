import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'
import { db } from '@/lib/db'
import { contentItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const utapi = new UTApi()

// Convert a Scribe viewer/shared URL to the shared URL format
function normaliseScribeUrl(url: string): string {
  return url
    .replace('scribehow.com/viewer/', 'scribehow.com/shared/')
    .replace('scribehow.com/embed/', 'scribehow.com/shared/')
}

// Extract guide ID from any Scribe URL format
function extractScribeId(url: string): string | null {
  const match = url.match(/__([A-Za-z0-9_-]{20,})/)
  return match ? match[1] : null
}

async function scrapeWithPuppeteer(scribeUrl: string): Promise<{ imageUrls: string[]; title: string; steps: { title: string; description: string }[] }> {
  // Dynamic import so build doesn't fail on systems without Chrome
  const puppeteer = await import('puppeteer-core')

  let executablePath: string
  try {
    // Try system Chrome first (works locally on Windows)
    const { default: chromium } = await import('@sparticuz/chromium-min')
    executablePath = await chromium.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar`
    )
  } catch {
    // Fallback to system Chrome on Windows
    executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  }

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const imageUrls: string[] = []
  const page = await browser.newPage()

  // Intercept all requests and capture S3 image URLs
  await page.setRequestInterception(true)
  page.on('request', req => {
    const url = req.url()
    if (url.includes('colony-recorder.s3') && url.includes('screenshot')) {
      if (!imageUrls.includes(url)) imageUrls.push(url)
    }
    req.continue()
  })

  // Also capture from responses
  page.on('response', async res => {
    const url = res.url()
    if (url.includes('colony-recorder.s3') && url.includes('screenshot')) {
      if (!imageUrls.includes(url)) imageUrls.push(url)
    }
  })

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.goto(normaliseScribeUrl(scribeUrl), { waitUntil: 'networkidle2', timeout: 30000 })

  // Wait for steps to render
  await page.waitForSelector('[data-step]', { timeout: 8000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 2000))

  // Scroll through the page to trigger lazy-loaded images
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      let totalHeight = 0
      const timer = setInterval(() => {
        window.scrollBy(0, 400)
        totalHeight += 400
        if (totalHeight >= document.body.scrollHeight) { clearInterval(timer); resolve() }
      }, 200)
    })
  })
  await new Promise(r => setTimeout(r, 2000))

  // Extract step text + any img src that might be colony-recorder
  const { title, steps, extraImageUrls } = await page.evaluate(() => {
    const t = document.title.replace(' | Scribe', '').trim()
    const stepEls = Array.from(document.querySelectorAll('[data-step], .step, .guide-step'))
    const s = stepEls.map(el => ({
      title: el.querySelector('h2,h3,.step-title')?.textContent?.trim() ?? '',
      description: el.querySelector('p,.step-description,.step-text')?.textContent?.trim() ?? '',
    }))
    const imgs = Array.from(document.querySelectorAll('img'))
      .map(i => i.src)
      .filter(src => src.includes('colony-recorder') || src.includes('screenshot'))
    return { title: t, steps: s, extraImageUrls: imgs }
  })

  extraImageUrls.forEach(u => { if (!imageUrls.includes(u)) imageUrls.push(u) })

  await browser.close()
  return { imageUrls, title, steps }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scribeUrl, projectId } = await req.json()
  if (!scribeUrl || !projectId) return NextResponse.json({ error: 'Missing scribeUrl or projectId' }, { status: 400 })

  try {
    const { imageUrls, title, steps } = await scrapeWithPuppeteer(scribeUrl)

    if (!imageUrls.length) {
      return NextResponse.json({ error: 'No screenshots found. Make sure the Scribe guide is publicly accessible.' }, { status: 400 })
    }

    // Get current count for order_index
    const existing = await db.select().from(contentItems).where(eq(contentItems.projectId, projectId))
    let orderIndex = existing.length

    const saved = []

    // Download each image from S3 and re-upload to UploadThing immediately (signed URLs expire in 15 min)
    for (const imgUrl of imageUrls) {
      try {
        const res = await fetch(imgUrl, {
          headers: {
            'Referer': 'https://scribehow.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        if (!res.ok) continue

        const buffer = await res.arrayBuffer()
        const file = new File([buffer], `scribe-step-${orderIndex}.webp`, { type: 'image/webp' })

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

        saved.push(item)
        orderIndex++
      } catch {
        continue
      }
    }

    // Add a note with the guide title and source
    if (title) {
      const noteText = `Imported from Scribe: "${title}"\nSource: ${scribeUrl}\n\n${steps.filter(s => s.title).map((s, i) => `Step ${i + 1}: ${s.title}${s.description ? '\n' + s.description : ''}`).join('\n\n')}`
      const [noteItem] = await db.insert(contentItems).values({
        projectId, userId, type: 'note', content: noteText, orderIndex,
      }).returning()
      saved.push(noteItem)
    }

    return NextResponse.json({ imported: saved.length, items: saved })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    console.error('Scribe import error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
