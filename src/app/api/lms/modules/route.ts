import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsModules, lmsLessons } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const modules = await db.select().from(lmsModules).orderBy(asc(lmsModules.orderIndex))
  return NextResponse.json(modules)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseId, title, orderIndex } = await req.json()
  const [module] = await db.insert(lmsModules).values({ courseId, title, orderIndex: orderIndex ?? 0 }).returning()
  return NextResponse.json(module)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await db.delete(lmsModules).where(eq(lmsModules.id, id))
  return NextResponse.json({ success: true })
}
