import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lmsUserRoles, lmsOrgSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  const [row] = await db.select().from(lmsUserRoles).where(eq(lmsUserRoles.userId, userId))
  if (!['owner', 'admin'].includes(row?.role ?? '')) return null
  return userId
}

async function getOrCreate() {
  const rows = await db.select().from(lmsOrgSettings)
  if (rows.length > 0) return rows[0]
  const [created] = await db.insert(lmsOrgSettings).values({}).returning()
  return created
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const settings = await getOrCreate()
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { orgName, logoUrl, primaryColor, allowSelfRegister, defaultRole } = body

  const settings = await getOrCreate()
  const [updated] = await db
    .update(lmsOrgSettings)
    .set({
      ...(orgName !== undefined && { orgName }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(allowSelfRegister !== undefined && { allowSelfRegister }),
      ...(defaultRole !== undefined && { defaultRole }),
      updatedAt: new Date(),
    })
    .where(eq(lmsOrgSettings.id, settings.id))
    .returning()

  return NextResponse.json(updated)
}
