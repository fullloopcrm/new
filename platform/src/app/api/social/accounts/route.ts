import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getSocialAccounts, disconnectSocialAccount } from '@/lib/social'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const accounts = await getSocialAccounts(tenant.id)
    return NextResponse.json({ accounts })
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
