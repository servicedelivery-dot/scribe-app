import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'
import { db } from '@/lib/db'
import { contentItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const utapi = new UTApi()

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageUrls, projectId } = await req.json() as { imageUrls: string[]; projectId: string }

  if (!imageUrls?.length || !projectId) {
    return NextResponse.json({ error: 'Missing imageUrls or projectId' }, { status: 400 })
  }

  const validUrls = imageUrls.filter(u =>
    typeof u === 'string' &&
    u.startsWith('http') &&
    u.includes('colony-recorder.s3')
  )

  if (!validUrls.length) {
    return NextResponse.json({ error: 'No valid colony-recorder S3 URLs found.' }, { status: 400 })
  }

  const existing = await db.select().from(contentItems).where(eq(contentItems.projectId, projectId))
  let orderIndex = existing.length
  const saved = []

  for (let i = 0; i < validUrls.length; i++) {
    const imgUrl = validUrls[i]
    try {
      const res = await fetch(imgUrl, {
        headers: {
          'Referer': 'https://scribehow.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/avif,image/*,*/*',
        },
      })

      if (!res.ok) {
        console.warn(`Failed to fetch image ${i + 1}: ${res.status}`)
        continue
      }

      const buffer = await res.arrayBuffer()
      const mimeType = res.headers.get('content-type') || 'image/webp'
      const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg'
      const file = new File([buffer], `scribe-step-${i + 1}.${ext}`, { type: mimeType })

      const upload = await utapi.uploadFiles(file)
      if (upload.error) {
        console.warn(`UploadThing error for image ${i + 1}:`, upload.error)
        continue
      }

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
    } catch (err) {
      console.warn(`Error processing image ${i + 1}:`, err)
      continue
    }
  }

  if (!saved.length) {
    return NextResponse.json({
      error: 'All image downloads failed. The signed URLs may have expired (they last 15 minutes). Please copy fresh URLs from DevTools and try again.'
    }, { status: 400 })
  }

  return NextResponse.json({ imported: saved.length, items: saved })
}
