import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserProfiles, lmsEnrollments, lmsCertificates, lmsProgress, lmsCourseAssignments, lmsCourses, lmsUserRoles } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import ProfileClient from '@/components/lms/ProfileClient'
import { clerkClient } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)

  const [profile] = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, userId))
  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const [enrCount] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.userId, userId))
  const [certCount] = await db.select({ count: count() }).from(lmsCertificates).where(eq(lmsCertificates.userId, userId))
  const [progCount] = await db.select({ count: count() }).from(lmsProgress).where(eq(lmsProgress.userId, userId))

  const assignments = await db.select().from(lmsCourseAssignments).where(eq(lmsCourseAssignments.userId, userId))
  const assignedCourses = await Promise.all(assignments.map(async a => {
    const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, a.courseId))
    const [enrolled] = await db.select({ count: count() }).from(lmsEnrollments)
      .where(eq(lmsEnrollments.courseId, a.courseId))
    return { ...a, dueDate: a.dueDate?.toISOString() ?? null, assignedAt: a.assignedAt.toISOString(), course }
  }))

  return (
    <ProfileClient
      clerkUser={{ id: clerkUser.id, email: clerkUser.emailAddresses[0]?.emailAddress ?? '', imageUrl: clerkUser.imageUrl }}
      profile={profile ? { ...profile, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString() } : null}
      role={roleRow?.role ?? 'learner'}
      stats={{ enrolled: enrCount.count, certificates: certCount.count, lessonsCompleted: progCount.count }}
      assignedCourses={assignedCourses}
    />
  )
}
