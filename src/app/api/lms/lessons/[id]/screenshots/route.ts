import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsLessonScreenshots, lmsLessons } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lessonId } = await params
  const screenshots = await db
    .select()
    .from(lmsLessonScreenshots)
    .where(eq(lmsLessonScreenshots.lessonId, lessonId))
    .orderBy(desc(lmsLessonScreenshots.createdAt))

  return NextResponse.json(screenshots)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // No auth — accessible from mobile via QR code scan
  const { id: lessonId } = await params
  const { imageUrl, context, uploadedBy } = await req.json()

  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

  const [lesson] = await db.select().from(lmsLessons).where(eq(lmsLessons.id, lessonId))
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const [screenshot] = await db
    .insert(lmsLessonScreenshots)
    .values({ lessonId, courseId: lesson.courseId, imageUrl, context: context ?? '', uploadedBy: uploadedBy ?? null })
    .returning()

  return NextResponse.json(screenshot)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lessonId } = await params
  const { screenshotId } = await req.json()

  await db
    .delete(lmsLessonScreenshots)
    .where(eq(lmsLessonScreenshots.id, screenshotId))

  return NextResponse.json({ success: true })
}
