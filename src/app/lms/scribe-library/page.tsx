import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsScribeLibrary, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import ScribeLibrary from '@/components/lms/ScribeLibrary'

export const dynamic = 'force-dynamic'

export default async function ScribeLibraryPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(userRole?.role ?? '')) redirect('/lms')

  const [items, courses] = await Promise.all([
    db.select().from(lmsScribeLibrary).orderBy(asc(lmsScribeLibrary.orderIndex)),
    db.select({ id: lmsCourses.id, title: lmsCourses.title, emoji: lmsCourses.emoji })
      .from(lmsCourses).orderBy(asc(lmsCourses.title)),
  ])

  return <ScribeLibrary initialItems={items} courses={courses} />
}
