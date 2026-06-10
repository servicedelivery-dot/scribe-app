import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsCourseScreenshots } from '@/lib/db/schema'
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
  // Public — no auth, accessible from mobile via QR code scan
  const { id: courseId } = await params
  const { imageUrl, context, uploadedBy } = await req.json()

  if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

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
