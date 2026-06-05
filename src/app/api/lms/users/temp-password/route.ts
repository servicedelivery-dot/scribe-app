import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserProfiles, lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only admins can view temp passwords
  const [requester] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (requester?.role !== 'owner' && requester?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const [profile] = await db.select({ tempPassword: lmsUserProfiles.tempPassword })
    .from(lmsUserProfiles)
    .where(eq(lmsUserProfiles.userId, targetUserId))

  return NextResponse.json({ tempPassword: profile?.tempPassword ?? null })
}
