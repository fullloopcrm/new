import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getSocialPosts } from '@/lib/social'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const posts = await getSocialPosts(tenant.id)
    return NextResponse.json({ posts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
