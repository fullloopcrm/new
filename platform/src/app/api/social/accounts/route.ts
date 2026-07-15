import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getSocialAccounts, disconnectSocialAccount } from '@/lib/social'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const accounts = await getSocialAccounts(tenant.id)
    // Never expose the raw OAuth access_token to the browser -- the dashboard
    // only needs platform/account metadata, and any tenant member with
    // read-only dashboard access could otherwise steal the token and post
    // to the connected Facebook/Instagram account outside the app.
    const safeAccounts = accounts.map((a) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      platform: a.platform,
      account_id: a.account_id,
      account_name: a.account_name,
      token_expires_at: a.token_expires_at,
      page_id: a.page_id,
      connected_at: a.connected_at,
    }))
    return NextResponse.json({ accounts: safeAccounts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant } = await getTenantForRequest()
    const { platform } = await request.json()

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    await disconnectSocialAccount(tenant.id, platform)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
