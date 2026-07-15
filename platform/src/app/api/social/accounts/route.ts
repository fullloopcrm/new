import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { getSocialAccounts, disconnectSocialAccount } from '@/lib/social'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const accounts = await getSocialAccounts(tenant.id)
    // Never expose the raw OAuth access_token to the client — it's a live
    // Graph API credential and the dashboard only needs display fields.
    const safeAccounts = accounts.map(({ access_token: _access_token, ...rest }) => rest)
    return NextResponse.json({ accounts: safeAccounts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('settings.integrations')
    if (authError) return authError

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
