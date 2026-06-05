import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsUserProfiles } from '@/lib/db/schema'

function generateTempPassword(): string {
  // Unique per user: UUID-derived hex + fixed symbol suffix → always 16 chars, no ambiguous chars
  const uuid = crypto.randomUUID().replace(/-/g, '')
  const hex = uuid.slice(0, 10).toUpperCase()
  const suffix = ['!', '@', '#', '$', '%'][parseInt(uuid[10], 16) % 5]
  const mid = uuid.slice(11, 15).toLowerCase()
  return `${hex}${suffix}${mid}`
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { emailAddress, role = 'learner' } = await req.json()
  if (!emailAddress) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const tempPassword = generateTempPassword()

  try {
    const client = await clerkClient()

    const newUser = await client.users.createUser({
      emailAddress: [emailAddress],
      password: tempPassword,
    })

    // Save role
    await db.insert(lmsUserRoles).values({
      userId: newUser.id,
      role,
      email: emailAddress,
      assignedBy: userId,
    }).onConflictDoUpdate({ target: lmsUserRoles.userId, set: { role, email: emailAddress } })

    // Save profile with temp password for admin reference
    await db.insert(lmsUserProfiles).values({
      userId: newUser.id,
      tempPassword,
    }).onConflictDoUpdate({ target: lmsUserProfiles.userId, set: { tempPassword } })

    return NextResponse.json({ email: emailAddress, tempPassword, role })
  } catch (err: unknown) {
    const clerkErr = (err as any)?.errors?.[0]
    const msg = clerkErr?.longMessage || clerkErr?.message || (err instanceof Error ? err.message : 'Failed to create user')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
