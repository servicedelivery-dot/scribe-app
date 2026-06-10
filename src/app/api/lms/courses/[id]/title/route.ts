import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Public — used by the QR upload page on mobile
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const [course] = await db
    .select({ title: lmsCourses.title, emoji: lmsCourses.emoji })
    .from(lmsCourses)
    .where(eq(lmsCourses.id, id))

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ title: course.title, emoji: course.emoji })
}
