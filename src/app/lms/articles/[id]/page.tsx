import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsArticles, lmsUserRoles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ArticleViewer from '@/components/lms/ArticleViewer'

export const dynamic = 'force-dynamic'

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const isAdmin = ['owner', 'admin', 'manager'].includes(roleRow?.role ?? '')

  const [article] = await db.select().from(lmsArticles).where(eq(lmsArticles.id, id))
  if (!article) notFound()
  if (!article.published && !isAdmin) redirect('/lms/articles')

  return <ArticleViewer article={article} isAdmin={isAdmin} />
}
