import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsGroups, lmsCourseGroups } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const groups = await db.select().from(lmsGroups).orderBy(desc(lmsGroups.createdAt))

  const enriched = await Promise.all(groups.map(async (g) => {
    const [courseCount] = await db
      .select({ count: count() })
      .from(lmsCourseGroups)
      .where(eq(lmsCourseGroups.groupId, g.id))
    return { ...g, courseCount: courseCount.count }
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [group] = await db.insert(lmsGroups).values({
    name,
    description: description || null,
    color: color || '#003CA6',
    createdBy: userId,
  }).returning()

  return NextResponse.json(group)
}
