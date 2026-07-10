import { supabaseAdmin } from '@/app/site/nyc-mobile-salon/_lib/supabase'

interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface GoogleBusiness {
  account_name: string
  location_name: string
  location_title?: string
}

export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('google_tokens')
    .limit(1)
    .single()

  if (!data?.google_tokens) return null
  return data.google_tokens as GoogleTokens
}

export async function saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
  await supabaseAdmin
    .from('settings')
    .update({ google_tokens: tokens })
    .eq('id', 1)
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getGoogleTokens()
  if (!tokens) return null

  // If token is still valid (with 5min buffer), return it
  if (tokens.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokens.access_token
  }

  // Refresh the token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    console.error('Failed to refresh Google token:', await res.text())
    return null
  }

  const newTokens = await res.json()

  const updated: GoogleTokens = {
    access_token: newTokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (newTokens.expires_in * 1000),
  }

  await saveGoogleTokens(updated)
  return updated.access_token
}

export async function getGoogleBusiness(): Promise<GoogleBusiness | null> {
  const { data } = await supabaseAdmin
    .from('settings')
    .select('google_business')
    .limit(1)
    .single()

  if (!data?.google_business) return null
  return data.google_business as GoogleBusiness
}

export async function saveGoogleBusiness(business: GoogleBusiness): Promise<void> {
  await supabaseAdmin
    .from('settings')
    .update({ google_business: business })
    .eq('id', 1)
}
