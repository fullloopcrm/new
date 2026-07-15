import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { getSocialPosts } from '@/lib/social'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError

  try {
    const posts = await getSocialPosts(tenant.tenantId)
    return NextResponse.json({ posts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
