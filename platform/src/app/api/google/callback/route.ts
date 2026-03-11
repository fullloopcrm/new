import { NextResponse } from 'next/server'
import { saveGoogleTokens, saveGoogleBusiness } from '@/lib/google'

// Shared callback for both admin and dashboard Google OAuth
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const tenantId = url.searchParams.get('state') || ''

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.fullloopcrm.com'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/google?error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/dashboard/google?error=no_code`)
  }

  if (!tenantId) {
    return NextResponse.redirect(`${baseUrl}/dashboard/google?error=no_tenant`)
  }

  const redirectUri = `${baseUrl}/api/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${baseUrl}/dashboard/google?error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()

  await saveGoogleTokens(tenantId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (tokens.expires_in * 1000),
  })

  // Fetch account + location
  try {
    const accountRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (accountRes.ok) {
      const accountData = await accountRes.json()
      const account = accountData.accounts?.[0]

      if (account) {
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        )

        let locationName = null
        let locationTitle = null

        if (locationsRes.ok) {
          const locData = await locationsRes.json()
          const location = locData.locations?.[0]
          locationName = location?.name || null
          locationTitle = location?.title || null
        }

        await saveGoogleBusiness(tenantId, {
          account_name: account.name,
          location_name: locationName,
          location_title: locationTitle,
        })
      }
    }
  } catch (e) {
    console.error('Failed to fetch Google Business info:', e)
  }

  return NextResponse.redirect(`${baseUrl}/dashboard/google?connected=true`)
}
