import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseGroups, lmsCourses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({ course: lmsCourses })
    .from(lmsCourseGroups)
    .innerJoin(lmsCourses, eq(lmsCourseGroups.courseId, lmsCourses.id))
    .where(eq(lmsCourseGroups.groupId, id))

  return NextResponse.json(rows.map(r => r.course))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { courseId } = await req.json()
  if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 })

  const existing = await db
    .select()
    .from(lmsCourseGroups)
    .where(and(eq(lmsCourseGroups.groupId, id), eq(lmsCourseGroups.courseId, courseId)))

  if (existing.length > 0) return NextResponse.json({ error: 'Already in group' }, { status: 409 })

  const [row] = await db.insert(lmsCourseGroups).values({ groupId: id, courseId }).returning()

  return NextResponse.json(row)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId query param required' }, { status: 400 })

  await db
    .delete(lmsCourseGroups)
    .where(and(eq(lmsCourseGroups.groupId, id), eq(lmsCourseGroups.courseId, courseId)))

  return NextResponse.json({ success: true })
}
