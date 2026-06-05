import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsUserProfiles, lmsEnrollments, lmsCourseAssignments, lmsProgress, lmsQuizAttempts, lmsCertificates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin'].includes(requester?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: targetId } = await params
  const { displayName, role, department, jobTitle, phone, notes } = await req.json()

  // Update role + displayName in lmsUserRoles
  const existingRole = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, targetId))
  if (existingRole.length) {
    await db.update(lmsUserRoles).set({ ...(role && { role }), ...(displayName !== undefined && { displayName }) }).where(eq(lmsUserRoles.userId, targetId))
  } else {
    await db.insert(lmsUserRoles).values({ userId: targetId, role: role ?? 'learner', displayName, assignedBy: userId })
  }

  // Update profile in lmsUserProfiles
  const existingProfile = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, targetId))
  if (existingProfile.length) {
    await db.update(lmsUserProfiles).set({ department, jobTitle, phone, notes, updatedAt: new Date() }).where(eq(lmsUserProfiles.userId, targetId))
  } else {
    await db.insert(lmsUserProfiles).values({ userId: targetId, department, jobTitle, phone, notes })
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin'].includes(requester?.role ?? '')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: targetId } = await params
  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, targetId))
  const [profile] = await db.select().from(lmsUserProfiles).where(eq(lmsUserProfiles.userId, targetId))

  return NextResponse.json({ roleRow: roleRow ?? null, profile: profile ?? null })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owners can delete users
  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (requester?.role !== 'owner') return NextResponse.json({ error: 'Forbidden — owner only' }, { status: 403 })

  const { id: targetId } = await params
  if (targetId === userId) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  // Delete all LMS data for this user
  await Promise.all([
    db.delete(lmsEnrollments).where(eq(lmsEnrollments.userId, targetId)),
    db.delete(lmsCourseAssignments).where(eq(lmsCourseAssignments.userId, targetId)),
    db.delete(lmsProgress).where(eq(lmsProgress.userId, targetId)),
    db.delete(lmsQuizAttempts).where(eq(lmsQuizAttempts.userId, targetId)),
    db.delete(lmsCertificates).where(eq(lmsCertificates.userId, targetId)),
    db.delete(lmsUserProfiles).where(eq(lmsUserProfiles.userId, targetId)),
    db.delete(lmsUserRoles).where(eq(lmsUserRoles.userId, targetId)),
  ])

  // Delete from Clerk
  try {
    const client = await clerkClient()
    await client.users.deleteUser(targetId)
  } catch (err: unknown) {
    const msg = (err as any)?.errors?.[0]?.message || 'Clerk delete failed'
    return NextResponse.json({ error: `DB cleaned but Clerk delete failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
