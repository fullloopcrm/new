import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isKnownTenantStatus } from '@/lib/tenant-status'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('*, tenant_members(id)')
    .order('created_at', { ascending: false })

  return NextResponse.json({ tenants })
}

export async function PATCH(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, status } = await request.json()
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  }
  // tenantServesSite() is a case-sensitive exact match against a fixed status
  // set — an unvalidated free-text status here could write successfully while
  // never actually gating the tenant (see tenant-status.ts).
  if (!isKnownTenantStatus(status)) {
    return NextResponse.json({ error: `Unknown status: ${status}` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
