import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsActivityLog, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import ActivityLog from '@/components/lms/ActivityLog'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(userRole?.role ?? '')) redirect('/lms')

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
    .orderBy(desc(lmsActivityLog.createdAt))
    .limit(50)

  const entries = rows.map((r) => ({
    ...r,
    actorName: r.actorName ?? r.roleDisplayName ?? 'Unknown User',
    createdAt: r.createdAt.toISOString(),
  }))

  return <ActivityLog initialEntries={entries} />
}
