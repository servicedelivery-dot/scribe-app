import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsAnnouncements } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import AnnouncementsPage from '@/components/lms/AnnouncementsClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const rows = await db.select().from(lmsAnnouncements).orderBy(desc(lmsAnnouncements.createdAt))
  const data = rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))

  return <AnnouncementsPage initialAnnouncements={data} />
}
