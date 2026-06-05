import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = await clerkClient()
  const { data: clerkUsers } = await client.users.getUserList({ limit: 200 })
  const roles = await db.select().from(lmsUserRoles)
  const roleMap = Object.fromEntries(roles.map(r => [r.userId, r]))

  const users = clerkUsers.map(u => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? '',
    name: (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()) || (u.emailAddresses[0]?.emailAddress ?? ''),
    imageUrl: u.imageUrl,
    role: roleMap[u.id]?.role ?? 'learner',
    createdAt: u.createdAt,
  }))

  return NextResponse.json(users)
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId, role, displayName, email } = await req.json()

  const existing = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, targetUserId))
  if (existing.length) {
    await db.update(lmsUserRoles).set({ role, displayName, email }).where(eq(lmsUserRoles.userId, targetUserId))
  } else {
    await db.insert(lmsUserRoles).values({ userId: targetUserId, role, displayName, email, assignedBy: userId })
  }
  return NextResponse.json({ success: true })
}
