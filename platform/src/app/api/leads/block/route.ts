import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('leads.view')
  if (authError) return authError

  const { domain } = await request.json()
  if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('blocked_referrers')
    .upsert(
      { tenant_id: tenant.tenantId, domain: domain.toLowerCase() },
      { onConflict: 'tenant_id,domain' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const { tenant, error: authError } = await requirePermission('leads.view')
  if (authError) return authError

  const { domain } = await request.json()
  if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

  await supabaseAdmin
    .from('blocked_referrers')
    .delete()
    .eq('tenant_id', tenant.tenantId)
    .eq('domain', domain.toLowerCase())

  return NextResponse.json({ success: true })
}
