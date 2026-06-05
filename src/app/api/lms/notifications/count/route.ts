import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsNotifications } from '@/lib/db/schema'
import { and, eq, count } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ unread }] = await db
    .select({ unread: count() })
    .from(lmsNotifications)
    .where(
      and(
        eq(lmsNotifications.userId, userId),
        eq(lmsNotifications.read, false)
      )
    )

  return NextResponse.json({ unread })
}
