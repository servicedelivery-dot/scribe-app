import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsArticles, lmsUserRoles } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import ArticlesClient from '@/components/lms/ArticlesClient'

export const dynamic = 'force-dynamic'

export default async function ArticlesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [roleRow] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  const role = roleRow?.role ?? 'learner'
  const isAdmin = ['owner', 'admin', 'manager'].includes(role)

  const articles = await db
    .select()
    .from(lmsArticles)
    .where(isAdmin ? undefined : eq(lmsArticles.published, true))
    .orderBy(desc(lmsArticles.pinned), desc(lmsArticles.createdAt))

  return <ArticlesClient articles={articles} isAdmin={isAdmin} />
}
