import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { getSocialPosts } from '@/lib/social'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('campaigns.view')
    if (authError) return authError
    const posts = await getSocialPosts(tenant.tenantId)
    return NextResponse.json({ posts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
