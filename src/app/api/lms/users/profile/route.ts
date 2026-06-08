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

async function upsertProfile(userId: string, body: Record<string, unknown>) {
  const s = (k: string) => typeof body[k] === 'string' ? body[k] as string : undefined
  const fields = {
    firstName: s('firstName'), lastName: s('lastName'), department: s('department'),
    jobTitle: s('jobTitle'), phone: s('phone'), supplierCompany: s('supplierCompany'), notes: s('notes'),
    ...(body.onboardingComplete !== undefined ? { onboardingComplete: Boolean(body.onboardingComplete) } : {}),
  }
  const existing = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, userId))
  if (existing.length) {
    await db.update(lmsUserProfiles).set({ ...fields, updatedAt: new Date() }).where(eq(lmsUserProfiles.userId, userId))
  } else {
    await db.insert(lmsUserProfiles).values({ userId, ...fields })
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await upsertProfile(userId, await req.json())
  return NextResponse.json({ success: true })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await upsertProfile(userId, await req.json())
  return NextResponse.json({ success: true })
}
