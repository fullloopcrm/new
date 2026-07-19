/**
 * Admin-only decrypt path for a Sales Partner's W-9, for payout/tax purposes
 * (nycmaid ref 072ceed0). Gated on sales_partners.payout — the same
 * highest-stakes tier as referrals.payout (this reveals a full SSN/EIN, a
 * strictly more sensitive disclosure than "who gets paid how much").
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { decryptW9Data } from '@/lib/w9-crypto'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('sales_partners.payout')
  if (authError) return authError
  const { tenantId } = tenant

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: row, error } = await supabaseAdmin
    .from('sales_partner_w9')
    .select('sales_partner_id, tax_classification, tin_type, tin_last4, encrypted_data, status, submitted_at, verified_at, verified_by, rejected_reason')
    .eq('sales_partner_id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error(`ADMIN_SALES_PARTNER_W9_LOOKUP_ERROR partner_id=${id} error=${error.message}`)
    return NextResponse.json({ error: 'Could not load W-9' }, { status: 500 })
  }
  if (!row) return NextResponse.json({ error: 'No W-9 on file' }, { status: 404 })

  let decrypted
  try {
    decrypted = decryptW9Data(row.encrypted_data)
  } catch (err) {
    console.error(`ADMIN_SALES_PARTNER_W9_DECRYPT_ERROR partner_id=${id} error=${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ error: 'Failed to decrypt W-9 — the record may be corrupted' }, { status: 500 })
  }

  return NextResponse.json({
    sales_partner_id: row.sales_partner_id,
    tax_classification: row.tax_classification,
    tin_type: row.tin_type,
    tin_last4: row.tin_last4,
    status: row.status,
    submitted_at: row.submitted_at,
    verified_at: row.verified_at,
    verified_by: row.verified_by,
    rejected_reason: row.rejected_reason,
    ...decrypted,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('sales_partners.payout')
  if (authError) return authError
  const { tenantId, userId } = tenant

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const status = body?.status
  if (status !== 'verified' && status !== 'rejected') {
    return NextResponse.json({ error: "status must be 'verified' or 'rejected'" }, { status: 400 })
  }
  const rejectedReason = status === 'rejected' && typeof body?.rejected_reason === 'string'
    ? body.rejected_reason.slice(0, 500)
    : null

  const { data, error } = await supabaseAdmin
    .from('sales_partner_w9')
    .update({
      status,
      verified_at: status === 'verified' ? new Date().toISOString() : null,
      verified_by: status === 'verified' ? userId : null,
      rejected_reason: rejectedReason,
    })
    .eq('sales_partner_id', id)
    .eq('tenant_id', tenantId)
    .select('sales_partner_id, status, verified_at, verified_by, rejected_reason')
    .maybeSingle()

  if (error) {
    console.error(`ADMIN_SALES_PARTNER_W9_UPDATE_ERROR partner_id=${id} error=${error.message}`)
    return NextResponse.json({ error: 'Failed to update W-9 status' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'No W-9 on file' }, { status: 404 })

  return NextResponse.json(data)
}
