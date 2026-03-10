import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/app/api/admin-auth/route'

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // authorized
}
