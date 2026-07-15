import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  try {
    // Connecting a new Instagram business account is the mutating counterpart
    // to DELETE (disconnect), which requires settings.integrations -- gate
    // connect the same way, else any authenticated tenant member could link
    // an account the tenant then posts through.
    const { tenant, error: authError } = await requirePermission('settings.integrations')
    if (authError) return authError

    const appId = process.env.FACEBOOK_APP_ID
    if (!appId) {
      return NextResponse.json({ error: 'Facebook app not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
    const redirectUri = `${baseUrl}/api/social/connect/instagram/callback`
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,instagram_basic,instagram_content_publish'

    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${encodeURIComponent(signOAuthState(tenant.tenantId))}`

    return NextResponse.json({ url })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
