import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsUserGroups, lmsNotifications } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  if (!['owner', 'admin', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { targetUserId, message } = await req.json() as { targetUserId: string; message?: string }
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  // Managers can only nudge users in their groups
  if (role === 'manager') {
    const myGroupRows = await db
      .select({ groupId: lmsUserGroups.groupId })
      .from(lmsUserGroups)
      .where(eq(lmsUserGroups.userId, userId))
    const myGroupIds = myGroupRows.map(r => r.groupId)

    if (myGroupIds.length > 0) {
      const memberRows = await db
        .select({ userId: lmsUserGroups.userId })
        .from(lmsUserGroups)
        .where(inArray(lmsUserGroups.groupId, myGroupIds))
      const memberIds = memberRows.map(r => r.userId)
      if (!memberIds.includes(targetUserId)) {
        return NextResponse.json({ error: 'Cannot nudge users outside your groups' }, { status: 403 })
      }
    }
  }

  const actorName = roleRow?.displayName ?? roleRow?.email ?? 'Your manager'
  const notifTitle = message?.trim() || 'You have outstanding course work — please log in and continue your learning.'
  const fullTitle = `Reminder from ${actorName}`

  await db.insert(lmsNotifications).values({
    userId: targetUserId,
    type: 'nudge',
    title: fullTitle,
    body: notifTitle,
    link: '/lms',
  })

  return NextResponse.json({ success: true })
}
