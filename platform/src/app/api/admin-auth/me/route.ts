/**
 * Admin session check — returns the current admin identity if the cookie is
 * valid. Ported from nycmaid `/api/auth/me` (was DB-backed admin_users; here
 * it's the platform-super-admin PIN token OR a Clerk-backed tenant member).
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (adminToken && verifyAdminToken(adminToken)) {
    return NextResponse.json({
      id: 'super_admin',
      role: 'super_admin',
      name: 'Platform Admin',
      email: null,
      source: 'pin',
    })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('tenant_members')
    .select('id, email, name, role, tenant_id')
    .eq('clerk_user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  return NextResponse.json({
    id: member.id,
    role: member.role,
    name: member.name,
    email: member.email,
    tenant_id: member.tenant_id,
    source: 'clerk',
  })
}
