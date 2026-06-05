import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsScribeLibrary } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await db.select().from(lmsScribeLibrary).orderBy(asc(lmsScribeLibrary.orderIndex), asc(lmsScribeLibrary.createdAt))
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, slidesUrl, movieUrl, scrollUrl } = await req.json()
  if (!title || !slidesUrl) return NextResponse.json({ error: 'title and slidesUrl required' }, { status: 400 })

  const [item] = await db.insert(lmsScribeLibrary).values({ title, slidesUrl, movieUrl: movieUrl || '', scrollUrl: scrollUrl || '' }).returning()
  return NextResponse.json(item)
}
