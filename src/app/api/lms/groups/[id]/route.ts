import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsGroups } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(lmsGroups).where(eq(lmsGroups.id, params.id))
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, color } = await req.json()
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (color !== undefined) updates.color = color

  const [updated] = await db
    .update(lmsGroups)
    .set(updates)
    .where(eq(lmsGroups.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
