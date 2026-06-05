import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contentItems } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, content, orderIndex } = await req.json()
  const [item] = await db.insert(contentItems).values({
    projectId,
    userId,
    type: 'note',
    content,
    orderIndex: orderIndex ?? 0,
  }).returning()

  return NextResponse.json(item)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)))
  return NextResponse.json({ success: true })
}
