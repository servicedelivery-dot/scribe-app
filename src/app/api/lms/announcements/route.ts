import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsAnnouncements } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await db.select().from(lmsAnnouncements).orderBy(desc(lmsAnnouncements.createdAt))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { title, body, pinned } = await req.json()
  const [row] = await db.insert(lmsAnnouncements).values({ createdBy: userId, title, body, pinned: !!pinned }).returning()
  return NextResponse.json(row)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await db.delete(lmsAnnouncements).where(eq(lmsAnnouncements.id, id))
  return NextResponse.json({ success: true })
}
