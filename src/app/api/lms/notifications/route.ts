import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsNotifications } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'

// GET: fetch notifications for authenticated user, last 50
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await db
    .select()
    .from(lmsNotifications)
    .where(eq(lmsNotifications.userId, userId))
    .orderBy(desc(lmsNotifications.createdAt))
    .limit(50)

  return NextResponse.json({ notifications })
}

// POST: create a notification (used internally by other routes)
export async function POST(req: Request) {
  const body = await req.json() as {
    userId: string
    type: string
    title: string
    body?: string
    link?: string
  }

  if (!body.userId || !body.type || !body.title) {
    return NextResponse.json({ error: 'userId, type, and title are required' }, { status: 400 })
  }

  const [notification] = await db
    .insert(lmsNotifications)
    .values({
      userId: body.userId,
      type: body.type,
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
    })
    .returning()

  return NextResponse.json({ notification })
}

// PATCH: mark notifications as read
export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!ids?.length) return NextResponse.json({ updated: 0 })

  await db
    .update(lmsNotifications)
    .set({ read: true })
    .where(
      and(
        eq(lmsNotifications.userId, userId),
        inArray(lmsNotifications.id, ids)
      )
    )

  return NextResponse.json({ updated: ids.length })
}
