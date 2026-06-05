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

  const formData = await req.formData()
  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string

  if (!file || !projectId) {
    return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 })
  }

  // Upload directly via server-side UTApi — no callback needed
  const response = await utapi.uploadFiles(file)

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 400 })
  }

  const existing = await db.select().from(contentItems).where(eq(contentItems.projectId, projectId))

  const [item] = await db.insert(contentItems).values({
    projectId,
    userId,
    type: 'image',
    storageKey: response.data.key,
    publicUrl: response.data.ufsUrl,
    orderIndex: existing.length,
  }).returning()

  return NextResponse.json(item)
}
