import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsUserProfiles, lmsCourseAssignments, lmsEnrollments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { firstName, lastName, email, password, role, department, jobTitle, phone, notes, courseIds } = await req.json()

  if (!email || !password || !firstName) {
    return NextResponse.json({ error: 'First name, email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  try {
    const client = await clerkClient()

    // Create user in Clerk
    const newUser = await client.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName: lastName || '',
    })

    // Save role
    await db.insert(lmsUserRoles).values({
      userId: newUser.id,
      role: role || 'learner',
      displayName: `${firstName} ${lastName || ''}`.trim(),
      email,
      assignedBy: userId,
    }).onConflictDoUpdate({ target: lmsUserRoles.userId, set: { role, displayName: `${firstName} ${lastName || ''}`.trim(), email } })

    // Save profile
    await db.insert(lmsUserProfiles).values({
      userId: newUser.id,
      firstName,
      lastName: lastName || '',
      department: department || null,
      jobTitle: jobTitle || null,
      phone: phone || null,
      notes: notes || null,
      tempPassword: password,
    })

    // Assign + auto-enroll in courses if specified
    if (courseIds?.length) {
      for (const courseId of courseIds) {
        // Assignment record
        await db.insert(lmsCourseAssignments).values({
          userId: newUser.id, courseId, assignedBy: userId,
        }).catch(() => {})
        // Also enroll them
        await db.insert(lmsEnrollments).values({
          userId: newUser.id, courseId,
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      id: newUser.id,
      email,
      name: `${firstName} ${lastName || ''}`.trim(),
      role: role || 'learner',
      message: 'User created successfully. They can now login with their email and password.',
    })
  } catch (err: unknown) {
    const msg = (err as any)?.errors?.[0]?.longMessage
      || (err as any)?.errors?.[0]?.message
      || (err instanceof Error ? err.message : 'Failed to create user')
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
