import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserGroups, lmsUserRoles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET — list users in this group (with display name + email + role)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params

  const rows = await db
    .select({
      id: lmsUserGroups.id,
      userId: lmsUserGroups.userId,
      assignedAt: lmsUserGroups.assignedAt,
      displayName: lmsUserRoles.displayName,
      email: lmsUserRoles.email,
      role: lmsUserRoles.role,
    })
    .from(lmsUserGroups)
    .leftJoin(lmsUserRoles, eq(lmsUserGroups.userId, lmsUserRoles.userId))
    .where(eq(lmsUserGroups.groupId, groupId))

  return NextResponse.json(rows.map(r => ({
    id: r.id,
    userId: r.userId,
    displayName: r.displayName ?? r.email ?? r.userId,
    email: r.email ?? '',
    role: r.role ?? 'learner',
    assignedAt: r.assignedAt,
  })))
}

// POST — add a user to the group
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params
  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  // Prevent duplicates
  const existing = await db
    .select()
    .from(lmsUserGroups)
    .where(and(eq(lmsUserGroups.groupId, groupId), eq(lmsUserGroups.userId, targetUserId)))

  if (existing.length) return NextResponse.json({ error: 'Already in group' }, { status: 409 })

  const [row] = await db.insert(lmsUserGroups).values({
    groupId,
    userId: targetUserId,
    assignedBy: userId,
  }).returning()

  return NextResponse.json(row)
}

// DELETE — remove a user from the group (?userId=xxx)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: groupId } = await params
  const targetUserId = new URL(req.url).searchParams.get('userId')
  if (!targetUserId) return NextResponse.json({ error: 'userId query param required' }, { status: 400 })

  await db
    .delete(lmsUserGroups)
    .where(and(eq(lmsUserGroups.groupId, groupId), eq(lmsUserGroups.userId, targetUserId)))

  return NextResponse.json({ success: true })
}
