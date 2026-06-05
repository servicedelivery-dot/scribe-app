import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { projects, contentItems, generatedContent } from '@/lib/db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import ProjectWorkspace from '@/components/ProjectWorkspace'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [project] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))

  if (!project) notFound()

  const items = await db.select().from(contentItems)
    .where(eq(contentItems.projectId, id))
    .orderBy(asc(contentItems.orderIndex))

  const generated = await db.select().from(generatedContent)
    .where(eq(generatedContent.projectId, id))
    .orderBy(desc(generatedContent.createdAt))

  return (
    <ProjectWorkspace
      project={project}
      initialItems={items}
      initialGenerated={generated}
    />
  )
}
