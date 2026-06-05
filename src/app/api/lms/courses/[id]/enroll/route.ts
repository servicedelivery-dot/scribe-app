import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsEnrollments } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.select().from(lmsEnrollments).where(and(eq(lmsEnrollments.courseId, id), eq(lmsEnrollments.userId, userId)))
  if (existing.length) return NextResponse.json({ enrolled: true })

  await db.insert(lmsEnrollments).values({ userId, courseId: id })
  return NextResponse.json({ enrolled: true })
}
