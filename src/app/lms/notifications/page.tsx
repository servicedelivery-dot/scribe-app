import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsNotifications } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import NotificationsList from '@/components/lms/NotificationsList'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Fetch all notifications for the user
  const rows = await db
    .select()
    .from(lmsNotifications)
    .where(eq(lmsNotifications.userId, userId))
    .orderBy(desc(lmsNotifications.createdAt))
    .limit(50)

  // Mark all as read in the background
  await db
    .update(lmsNotifications)
    .set({ read: true })
    .where(eq(lmsNotifications.userId, userId))

  const notifications = rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-screen" style={{ background: '#0d1b2e' }}>
      <div className="max-w-2xl mx-auto py-6 px-4">
        <NotificationsList initial={notifications} />
      </div>
    </div>
  )
}
