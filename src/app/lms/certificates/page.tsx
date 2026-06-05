import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsCertificates, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import CertificatesList from '@/components/lms/CertificatesList'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const isAdmin = roleRow?.role === 'admin' || roleRow?.role === 'manager'

  const certs = isAdmin
    ? await db.select().from(lmsCertificates).orderBy(desc(lmsCertificates.issuedAt))
    : await db.select().from(lmsCertificates).where(eq(lmsCertificates.userId, userId)).orderBy(desc(lmsCertificates.issuedAt))

  const enriched = await Promise.all(certs.map(async c => {
    const [course] = await db.select({ emoji: lmsCourses.emoji, description: lmsCourses.description }).from(lmsCourses).where(eq(lmsCourses.id, c.courseId))
    return { ...c, emoji: course?.emoji ?? '📚', issuedAt: c.issuedAt.toISOString() }
  }))

  return <CertificatesList certs={enriched} isAdmin={isAdmin} />
}
