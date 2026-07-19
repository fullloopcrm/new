/**
 * Sales Partner's own W-9 tax-form submission. Bearer-token-gated (own data
 * only, same session token as GET /api/sales-partners/me) — mirrors that
 * route's auth pattern. Sensitive fields (legal name, address, TIN) never
 * round-trip back to the partner in plaintext after submission; GET here
 * returns status metadata only. Full decrypt is admin-only, see
 * GET /api/admin/sales-partners/[id]/w9.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSalesPartnerAuth } from '@/lib/sales-partner-portal-auth'
import { validateW9Input, encryptW9Data, last4 } from '@/lib/w9-crypto'

export async function GET(request: Request) {
  const auth = getSalesPartnerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('sales_partner_w9')
    .select('tax_classification, tin_type, tin_last4, status, submitted_at, verified_at, rejected_reason')
    .eq('sales_partner_id', auth.pid)
    .eq('tenant_id', auth.tid)
    .maybeSingle()

  if (error) {
    console.error(`SALES_PARTNER_W9_STATUS_ERROR pid=${auth.pid} error=${error.message}`)
    return NextResponse.json({ error: 'Could not load W-9 status' }, { status: 500 })
  }

  return NextResponse.json({ w9: data || null })
}

export async function POST(request: Request) {
  const auth = getSalesPartnerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const validated = validateW9Input(body)
  if (validated.data === null) return NextResponse.json({ error: validated.error }, { status: 400 })
  const input = validated.data

  // Defense in depth: confirm the partner id in the token still belongs to
  // this tenant before writing tax data against it (mirrors the tenant_id
  // recheck on PUT /api/sales-partners/me).
  const { data: partner } = await supabaseAdmin
    .from('sales_partners')
    .select('id')
    .eq('id', auth.pid)
    .eq('tenant_id', auth.tid)
    .maybeSingle()
  if (!partner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let encrypted: string
  try {
    encrypted = encryptW9Data({
      legal_name: input.legal_name,
      business_name: input.business_name,
      address_line1: input.address_line1,
      address_line2: input.address_line2,
      city: input.city,
      state: input.state,
      zip: input.zip,
      tin: input.tin,
    })
  } catch (err) {
    console.error(`SALES_PARTNER_W9_ENCRYPT_ERROR pid=${auth.pid} error=${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ error: 'W-9 collection is temporarily unavailable. Please try again later.' }, { status: 503 })
  }

  // Upsert on sales_partner_id: a re-submission (e.g. after admin rejects
  // the first one) replaces the row and resets review state, rather than
  // accumulating multiple stale copies of tax data for the same partner.
  const { error: upsertError } = await supabaseAdmin
    .from('sales_partner_w9')
    .upsert(
      {
        tenant_id: auth.tid,
        sales_partner_id: auth.pid,
        tax_classification: input.tax_classification,
        tin_type: input.tin_type,
        tin_last4: last4(input.tin),
        encrypted_data: encrypted,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        verified_at: null,
        verified_by: null,
        rejected_reason: null,
      },
      { onConflict: 'sales_partner_id' },
    )

  if (upsertError) {
    console.error(`SALES_PARTNER_W9_SAVE_ERROR pid=${auth.pid} error=${upsertError.message}`)
    return NextResponse.json({ error: 'Failed to save W-9' }, { status: 500 })
  }

  return NextResponse.json({ status: 'submitted' })
}
