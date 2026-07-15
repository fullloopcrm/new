import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { signOAuthState } from '@/lib/oauth-state'

// Dashboard-level Google OAuth — business owner connects their own Google
export async function GET() {
  const { tenant: authTenant, error: authError } = await requirePermission('settings.integrations')
  if (authError) return authError
  const tenant = authTenant.tenant
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
    const redirectUri = `${baseUrl}/api/google/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state: signOAuthState(tenant.id),
    })

    return NextResponse.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    })
  } catch (e) {
    throw e
  }
}
