import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCertificates, lmsCourses } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1' // admin: fetch all

  const certs = all
    ? await db.select().from(lmsCertificates).orderBy(desc(lmsCertificates.issuedAt))
    : await db.select().from(lmsCertificates).where(eq(lmsCertificates.userId, userId)).orderBy(desc(lmsCertificates.issuedAt))

  const enriched = await Promise.all(certs.map(async c => {
    const [course] = await db.select({ emoji: lmsCourses.emoji }).from(lmsCourses).where(eq(lmsCourses.id, c.courseId))
    return { ...c, emoji: course?.emoji ?? '📚' }
  }))

  return NextResponse.json(enriched)
}
