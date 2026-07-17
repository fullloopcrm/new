import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isKnownTenantStatus } from '@/lib/tenant-status'
import { ENCRYPTED_TENANT_FIELDS } from '@/lib/secret-crypto'
import { omit } from '@/lib/validate'

// Sibling of admin/tenants/[id]'s redaction: this is the LIST version of that
// same select('*') tenant row, returned wholesale to every one of this route's
// consumers (admin/tenants, admin/settings, admin/team, admin/finance pages).
// Grepped all 4 — none reference a vendor-secret or google_tokens field name,
// so the same zero-consumer redaction applies here.
const NEVER_RETURNED_TENANT_FIELDS = [...ENCRYPTED_TENANT_FIELDS, 'google_tokens'] as const

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('*, tenant_members(id)')
    .order('created_at', { ascending: false })

  return NextResponse.json({
    tenants: (tenants || []).map(t => omit(t, [...NEVER_RETURNED_TENANT_FIELDS])),
  })
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
