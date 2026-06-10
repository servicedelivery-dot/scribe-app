import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsLessons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Public — used by the QR upload page on mobile (no auth required)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const [lesson] = await db
    .select({ title: lmsLessons.title })
    .from(lmsLessons)
    .where(eq(lmsLessons.id, id))

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ title: lesson.title })
}
