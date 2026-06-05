import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsSignoffs, lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = userRole?.role
  if (role !== 'owner' && role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { status, notes } = await req.json()
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const [updated] = await db.update(lmsSignoffs)
    .set({
      status,
      reviewedBy: userId,
      reviewedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    })
    .where(eq(lmsSignoffs.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...updated,
    requestedAt: updated.requestedAt.toISOString(),
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  })
}
