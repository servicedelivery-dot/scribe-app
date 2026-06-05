import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserProfiles, lmsEnrollments, lmsCertificates, lmsProgress, lmsCourseAssignments, lmsCourses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, userId))

  // Stats
  const enrollments = await db.select().from(lmsEnrollments).where(eq(lmsEnrollments.userId, userId))
  const certificates = await db.select().from(lmsCertificates).where(eq(lmsCertificates.userId, userId))
  const progress = await db.select().from(lmsProgress).where(eq(lmsProgress.userId, userId))

  // Assigned courses
  const assignments = await db.select().from(lmsCourseAssignments).where(eq(lmsCourseAssignments.userId, userId))
  const assignedCourses = await Promise.all(
    assignments.map(async a => {
      const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, a.courseId))
      return { ...a, course }
    })
  )

  return NextResponse.json({
    profile: profile ?? null,
    stats: {
      enrolled: enrollments.length,
      certificates: certificates.length,
      lessonsCompleted: progress.length,
    },
    assignedCourses,
  })
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { firstName, lastName, department, jobTitle, phone } = await req.json()

  const existing = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, userId))
  if (existing.length) {
    await db.update(lmsUserProfiles).set({ firstName, lastName, department, jobTitle, phone, updatedAt: new Date() })
      .where(eq(lmsUserProfiles.userId, userId))
  } else {
    await db.insert(lmsUserProfiles).values({ userId, firstName, lastName, department, jobTitle, phone })
  }
  return NextResponse.json({ success: true })
}
