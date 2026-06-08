import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsArticles, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1' // admin: fetch unpublished too

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const isAdmin = ['owner', 'admin', 'manager'].includes(roleRow?.role ?? '')

  const articles = await db
    .select()
    .from(lmsArticles)
    .where(all && isAdmin ? undefined : eq(lmsArticles.published, true))
    .orderBy(desc(lmsArticles.pinned), desc(lmsArticles.createdAt))

  return NextResponse.json(articles)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin', 'manager'].includes(roleRow?.role ?? ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, content, category, tags, emoji, published, pinned, estimatedReadMins, authorName } = body

  const [article] = await db.insert(lmsArticles).values({
    title,
    content,
    category: category || 'General',
    tags: tags || [],
    emoji: emoji || '📄',
    authorId: userId,
    authorName: authorName || 'Admin',
    published: published ?? false,
    pinned: pinned ?? false,
    estimatedReadMins: estimatedReadMins || 3,
  }).returning()

  return NextResponse.json(article)
}
