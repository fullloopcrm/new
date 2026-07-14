import { NextResponse } from 'next/server'
import { saveSocialAccount } from '@/lib/social'
import { verifyOAuthState } from '@/lib/oauth-state'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    // Verify the signed state (CSRF, CWE-352): only our own /connect/facebook
    // init can mint a state binding a page to this tenant. Forged/expired → reject.
    const tenantId = verifyOAuthState(searchParams.get('state'))

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=no_code`)
    }

    if (!tenantId) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=bad_state`)
    }

    const appId = process.env.FACEBOOK_APP_ID!
    const appSecret = process.env.FACEBOOK_APP_SECRET!
    const redirectUri = `${baseUrl}/api/social/connect/facebook/callback`

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Facebook token exchange failed:', tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=token_failed`)
    }

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longLivedData = await longLivedRes.json()
    const longLivedToken = longLivedData.access_token || tokenData.access_token

    // Get user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    )
    const pagesData = await pagesRes.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=no_pages`)
    }

    const page = pagesData.data[0]

    await saveSocialAccount(tenantId, 'facebook', {
      account_id: page.id,
      account_name: page.name,
      access_token: page.access_token,
      page_id: page.id,
      token_expires_at: longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
        : undefined,
    })

    return NextResponse.redirect(`${baseUrl}/dashboard/social?connected=facebook`)
  } catch (e) {
    console.error('Facebook callback error:', e)
    return NextResponse.redirect(`${baseUrl}/dashboard/social?error=unknown`)
  }
}
