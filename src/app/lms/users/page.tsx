import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsEnrollments, lmsCertificates } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import UserManagement from '@/components/lms/UserManagement'
import { clerkClient } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [userRole] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (userRole?.role !== 'owner' && userRole?.role !== 'admin') redirect('/lms')

  const client = await clerkClient()
  const { data: clerkUsers } = await client.users.getUserList({ limit: 200 })
  const roles = await db.select().from(lmsUserRoles)
  const roleMap = Object.fromEntries(roles.map(r => [r.userId, r.role]))

  const users = await Promise.all(clerkUsers.map(async u => {
    const [enr] = await db.select({ count: count() }).from(lmsEnrollments).where(eq(lmsEnrollments.userId, u.id))
    const [certs] = await db.select({ count: count() }).from(lmsCertificates).where(eq(lmsCertificates.userId, u.id))
    return {
      id: u.id,
      email: u.emailAddresses[0]?.emailAddress ?? '',
      name: (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()) || (u.emailAddresses[0]?.emailAddress ?? ''),
      imageUrl: u.imageUrl,
      role: (roleMap[u.id] ?? 'learner') as 'admin' | 'manager' | 'learner',
      enrollments: enr.count,
      certificates: certs.count,
      createdAt: new Date(u.createdAt).toISOString(),
    }
  }))

  return <UserManagement initialUsers={users} currentRole={userRole?.role as 'owner' | 'admin'} />
}
