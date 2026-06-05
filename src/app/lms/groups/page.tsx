import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsGroups, lmsCourseGroups, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import GroupsManager from '@/components/lms/GroupsManager'

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(userRole?.role ?? '')) redirect('/lms')

  const groups = await db.select().from(lmsGroups).orderBy(desc(lmsGroups.createdAt))

  const enriched = await Promise.all(groups.map(async (g) => {
    const [courseCount] = await db
      .select({ count: count() })
      .from(lmsCourseGroups)
      .where(eq(lmsCourseGroups.groupId, g.id))
    return { ...g, createdAt: g.createdAt.toISOString(), courseCount: Number(courseCount.count) }
  }))

  return <GroupsManager initialGroups={enriched} />
}
