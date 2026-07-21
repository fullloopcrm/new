import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// GET /api/admin/sales-partner-commissions/:id/breakdown
// One-shot aggregation for the Commissions tab's expandable row — same shape
// of thinking as /api/admin/bookings/:id/closeout-summary (booking math +
// payout status in one call), scaled down to what a commission actually is:
// a booking's gross amount × a rate, owed to a partner (direct) or a partner
// via a recruited referrer (override). All money values in cents.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, error: authError } = await requirePermission('sales_partners.view')
  if (authError) return authError
  const { tenantId } = tenant

  const { id } = await params

  const { data: commission, error } = await supabaseAdmin
    .from('sales_partner_commissions')
    .select('id, tenant_id, booking_id, sales_partner_id, source, referrer_id, client_name, gross_amount_cents, commission_rate, commission_cents, status, paid_at, paid_via, created_at, sales_partners(id, name, email, referral_code), referrers(id, name, referral_code)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !commission) {
    return NextResponse.json({ error: error?.message || 'commission not found' }, { status: 404 })
  }

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, start_time, service_type, price, payment_status, payment_method, status')
    .eq('id', commission.booking_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return NextResponse.json({
    commission: {
      id: commission.id,
      source: commission.source,
      status: commission.status,
      client_name: commission.client_name,
      gross_amount_cents: commission.gross_amount_cents,
      commission_rate: commission.commission_rate,
      commission_cents: commission.commission_cents,
      paid_at: commission.paid_at,
      paid_via: commission.paid_via,
      created_at: commission.created_at,
      sales_partner: commission.sales_partners || null,
      referrer: commission.referrers || null,
    },
    booking: booking || null,
  })
}
