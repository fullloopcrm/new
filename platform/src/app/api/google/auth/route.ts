import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

// Dashboard-level Google OAuth — business owner connects their own Google
export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()

    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fullloopcrm.com'
    const redirectUri = `${baseUrl}/api/google/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state: tenant.id,
    })

    return NextResponse.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
