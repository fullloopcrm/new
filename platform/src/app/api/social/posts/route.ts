import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { getSocialPosts } from '@/lib/social'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError
  const posts = await getSocialPosts(tenant.tenantId)
  return NextResponse.json({ posts })
}
