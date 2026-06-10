import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, id))
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Backfill: generate token if missing (e.g. courses created before this feature)
  if (!course.uploadToken) {
    const token = randomUUID()
    const [updated] = await db
      .update(lmsCourses)
      .set({ uploadToken: token })
      .where(eq(lmsCourses.id, id))
      .returning()
    return NextResponse.json({ token: updated.uploadToken })
  }

  return NextResponse.json({ token: course.uploadToken })
}

// Regenerate the token (revokes the old QR link)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const newToken = randomUUID()
  const [updated] = await db
    .update(lmsCourses)
    .set({ uploadToken: newToken })
    .where(eq(lmsCourses.id, id))
    .returning()

  return NextResponse.json({ token: updated.uploadToken })
}
