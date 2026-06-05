import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsActivityLog, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filterUserId = searchParams.get('userId')
  const filterAction = searchParams.get('action')
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const conditions = []
  if (filterUserId) conditions.push(eq(lmsActivityLog.userId, filterUserId))
  if (filterAction) conditions.push(eq(lmsActivityLog.action, filterAction))

  const rows = await db
    .select({
      id: lmsActivityLog.id,
      userId: lmsActivityLog.userId,
      actorName: lmsActivityLog.actorName,
      action: lmsActivityLog.action,
      entityType: lmsActivityLog.entityType,
      entityId: lmsActivityLog.entityId,
      entityName: lmsActivityLog.entityName,
      meta: lmsActivityLog.meta,
      createdAt: lmsActivityLog.createdAt,
      roleDisplayName: lmsUserRoles.displayName,
    })
    .from(lmsActivityLog)
    .leftJoin(lmsUserRoles, eq(lmsActivityLog.userId, lmsUserRoles.userId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(lmsActivityLog.createdAt))
    .limit(50)
    .offset(offset)

  const entries = rows.map((r) => ({
    ...r,
    actorName: r.actorName ?? r.roleDisplayName ?? 'Unknown User',
  }))

  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { actorName, action, entityType, entityId, entityName, meta, targetUserId } = body

  if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 })

  const [entry] = await db
    .insert(lmsActivityLog)
    .values({
      userId: targetUserId ?? userId,
      actorName: actorName ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      entityName: entityName ?? null,
      meta: meta ?? null,
    })
    .returning()

  return NextResponse.json({ entry }, { status: 201 })
}
