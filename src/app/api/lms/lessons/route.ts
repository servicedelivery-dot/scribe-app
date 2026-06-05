import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsLessons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { moduleId, courseId, title, content, orderIndex } = await req.json()
  const [lesson] = await db.insert(lmsLessons).values({ moduleId, courseId, title, content: content ?? '', orderIndex: orderIndex ?? 0 }).returning()
  return NextResponse.json(lesson)
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, title, content } = await req.json()
  const [lesson] = await db.update(lmsLessons).set({ title, content }).where(eq(lmsLessons.id, id)).returning()
  return NextResponse.json(lesson)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.delete(lmsLessons).where(eq(lmsLessons.id, id))
  return NextResponse.json({ success: true })
}
