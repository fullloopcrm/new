import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('leads.view')
  if (authError) return authError

  const { domain } = await request.json().catch(() => ({}))
  if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

  const { error } = await tenantDb(tenant.tenantId)
    .from('blocked_referrers')
    .upsert(
      { domain: domain.toLowerCase() },
      { onConflict: 'tenant_id,domain' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('leads.view')
  if (authError) return authError

  const { domain } = await request.json().catch(() => ({}))
  if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

  await tenantDb(tenant.tenantId)
    .from('blocked_referrers')
    .delete()
    .eq('domain', domain.toLowerCase())

  return NextResponse.json({ success: true })
}
