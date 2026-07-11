/**
 * Admin session check — returns the current admin identity if the cookie is
 * valid. Ported from nycmaid `/api/auth/me` (was DB-backed admin_users; here
 * it's the platform-super-admin PIN token OR a Clerk-backed tenant member).
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/app/api/admin-auth/route'

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

  // Clerk-backed tenant-member identity is retired; PIN is the only source.
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
