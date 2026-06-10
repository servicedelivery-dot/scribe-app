import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseScreenshots, lmsCourses } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const screenshots = await db
    .select()
    .from(lmsCourseScreenshots)
    .where(eq(lmsCourseScreenshots.courseId, courseId))
    .orderBy(desc(lmsCourseScreenshots.createdAt))

  return NextResponse.json(screenshots)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Token-based auth — no Clerk session needed, token validates the request
  const { id: courseId } = await params
  const { imageUrl, context, uploadedBy, token } = await req.json()

  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })
  if (!token) return NextResponse.json({ error: 'Upload token required' }, { status: 401 })

  const [course] = await db.select().from(lmsCourses).where(eq(lmsCourses.id, courseId))
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (course.uploadToken !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  const [screenshot] = await db
    .insert(lmsCourseScreenshots)
    .values({ courseId, imageUrl, context: context ?? '', uploadedBy: uploadedBy ?? null })
    .returning()

  return NextResponse.json(screenshot)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: courseId } = await params
  const { screenshotId } = await req.json()
  await db.delete(lmsCourseScreenshots).where(eq(lmsCourseScreenshots.id, screenshotId))

  return NextResponse.json({ success: true })
}
