import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, contentItems, generatedContent } from '@/lib/db/schema'
import { eq, count, sum, sql } from 'drizzle-orm'
import { UTApi } from 'uploadthing/server'
import UsageClient from '@/components/UsageClient'

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Our own DB stats
  const [projectCount] = await db.select({ count: count() }).from(projects).where(eq(projects.userId, userId))
  const [itemCount] = await db.select({ count: count() }).from(contentItems).where(eq(contentItems.userId, userId))
  const [genCount] = await db.select({ count: count() }).from(generatedContent).where(eq(generatedContent.userId, userId))
  const imageItems = await db.select({ count: count() }).from(contentItems)
    .where(sql`${contentItems.userId} = ${userId} AND ${contentItems.type} = 'image'`)

  // UploadThing file list
  let utFiles = 0
  let utSizeBytes = 0
  try {
    const utapi = new UTApi()
    const { files } = await utapi.listFiles({})
    utFiles = files.length
    utSizeBytes = files.reduce((acc, f) => acc + (f.size ?? 0), 0)
  } catch {}

  const stats = {
    projects: projectCount.count,
    contentItems: itemCount.count,
    images: imageItems[0].count,
    generated: genCount.count,
    utFiles,
    utSizeMB: Math.round(utSizeBytes / 1024 / 1024 * 100) / 100,
  }

  return <UsageClient stats={stats} />
}
