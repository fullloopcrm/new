import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { signOAuthState } from '@/lib/oauth-state'

export async function GET() {
  const { tenant: authTenant, error: authError } = await requirePermission('settings.integrations')
  if (authError) return authError
  const tenant = authTenant.tenant
  try {
    const appId = process.env.FACEBOOK_APP_ID
    if (!appId) {
      return NextResponse.json({ error: 'Facebook app not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
    const redirectUri = `${baseUrl}/api/social/connect/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata'

    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${encodeURIComponent(signOAuthState(tenant.id))}`

    return NextResponse.json({ url })
  } catch (e) {
    throw e
  }
}
