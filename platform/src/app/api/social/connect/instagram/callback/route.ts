import { NextResponse } from 'next/server'
import { saveSocialAccount } from '@/lib/social'
import { verifyOAuthState } from '@/lib/oauth-state'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    // Verify the signed state (CSRF, CWE-352): only our own /route init can mint a
    // state binding an Instagram account to this tenant. Forged/expired -> reject.
    const tenantId = verifyOAuthState(searchParams.get('state'))

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=no_code`)
    }

    if (!tenantId) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=bad_state`)
    }

    const appId = process.env.FACEBOOK_APP_ID!
    const appSecret = process.env.FACEBOOK_APP_SECRET!
    const redirectUri = `${baseUrl}/api/social/connect/instagram/callback`

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Instagram token exchange failed:', tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=token_failed`)
    }

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longLivedData = await longLivedRes.json()
    const longLivedToken = longLivedData.access_token || tokenData.access_token

    // Get user's pages to find the connected IG business account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`
    )
    const pagesData = await pagesRes.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=no_pages`)
    }

    const page = pagesData.data[0]

    // Get the Instagram Business Account ID linked to this page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()

    if (!igData.instagram_business_account?.id) {
      return NextResponse.redirect(`${baseUrl}/dashboard/social?error=no_ig_account`)
    }

    const igAccountId = igData.instagram_business_account.id

    // Get IG account name
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${page.access_token}`
    )
    const igProfile = await igProfileRes.json()

    await saveSocialAccount(tenantId, 'instagram', {
      account_id: igAccountId,
      account_name: igProfile.username || page.name,
      access_token: page.access_token,
      token_expires_at: longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
        : undefined,
    })

    return NextResponse.redirect(`${baseUrl}/dashboard/social?connected=instagram`)
  } catch (e) {
    console.error('Instagram callback error:', e)
    return NextResponse.redirect(`${baseUrl}/dashboard/social?error=unknown`)
  }
}
