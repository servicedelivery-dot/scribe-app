import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { FolderOpen } from 'lucide-react'
import NewProjectButton from '@/components/NewProjectButton'
import ProjectGrid from '@/components/ProjectGrid'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const rows = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt))

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Creator</h1>
          <p className="text-gray-400 mt-1">Upload screenshots and notes — AI generates courses and guides</p>
        </div>
        <NewProjectButton />
      </div>

      {!rows.length ? (
        <div className="text-center py-24">
          <FolderOpen className="mx-auto w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500 text-lg">No projects yet</p>
          <p className="text-gray-600 text-sm mt-1">Create a project to start adding content</p>
        </div>
      ) : (
        <ProjectGrid projects={rows} />
      )}
    </div>
  )
}
