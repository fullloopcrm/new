import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { getExpiringSocialAccounts, refreshFacebookToken } from '@/lib/social'

// Meta's long-lived page tokens run ~60 days and can only be extended while
// still valid -- once fully expired the tenant has to reconnect via OAuth.
// Refresh anything expiring within the next 7 days so a daily cron always
// catches it with margin.
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const accounts = await getExpiringSocialAccounts(REFRESH_WINDOW_MS)
  const results: { tenantId: string; platform: string; success: boolean; error?: string }[] = []

  for (const account of accounts) {
    // Instagram posting goes through the linked Facebook page's token --
    // there's no separate IG token to extend.
    if (account.platform !== 'facebook') continue

    const result = await refreshFacebookToken(account)
    results.push({ tenantId: account.tenant_id, platform: account.platform, ...result })
  }

  return NextResponse.json({ checked: accounts.length, refreshed: results })
}
