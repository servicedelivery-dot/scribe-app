import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsOrgSettings, lmsCourses, lmsEnrollments, lmsCertificates } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import SettingsPanel from '@/components/lms/SettingsPanel'

export const dynamic = 'force-dynamic'

async function getOrCreateSettings() {
  const rows = await db.select().from(lmsOrgSettings)
  if (rows.length > 0) return rows[0]
  const [created] = await db.insert(lmsOrgSettings).values({}).returning()
  return created
}

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = userRole?.role ?? 'learner'
  if (!['owner', 'admin'].includes(role)) redirect('/lms')

  const [settings, userCount, courseCount, enrollCount, certCount] = await Promise.all([
    getOrCreateSettings(),
    db.select({ count: count() }).from(lmsUserRoles),
    db.select({ count: count() }).from(lmsCourses),
    db.select({ count: count() }).from(lmsEnrollments),
    db.select({ count: count() }).from(lmsCertificates),
  ])

  return (
    <SettingsPanel
      settings={settings}
      stats={{
        users: userCount[0].count,
        courses: courseCount[0].count,
        enrollments: enrollCount[0].count,
        certificates: certCount[0].count,
      }}
      aiKeySet={!!process.env.GEMINI_API_KEY}
      currentRole={role as 'owner' | 'admin'}
    />
  )
}
