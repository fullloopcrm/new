import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { getSocialAccounts, disconnectSocialAccount } from '@/lib/social'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError

  try {
    const accounts = await getSocialAccounts(tenant.tenantId)
    // access_token is a live Facebook/Instagram Graph API credential — never
    // send it to the browser. The dashboard UI only renders platform/account
    // name/connected_at, never the token itself.
    const safeAccounts = accounts.map(({ access_token: _access_token, ...rest }) => rest)
    return NextResponse.json({ accounts: safeAccounts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.integrations')
  if (authError) return authError

  try {
    const { platform } = await request.json()

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    await disconnectSocialAccount(tenant.tenantId, platform)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
