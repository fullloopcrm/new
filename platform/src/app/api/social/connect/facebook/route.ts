import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    await getTenantForRequest()

    const appId = process.env.FACEBOOK_APP_ID
    if (!appId) {
      return NextResponse.json({ error: 'Facebook app not configured' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/connect/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata'

    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`

    return NextResponse.json({ url })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
