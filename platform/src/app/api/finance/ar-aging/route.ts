/**
 * Accounts Receivable aging — unpaid invoices + unpaid completed bookings,
 * bucketed by days past due.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'

const BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60', minDays: 31, maxDays: 60 },
  { label: '61-90', minDays: 61, maxDays: 90 },
  { label: '90+', minDays: 91, maxDays: Infinity },
]

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entityId = entityIdFromUrl(new URL(request.url))
    const today = new Date()

    // Unpaid invoices
    let invQ = supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, title, total_cents, amount_paid_cents, due_date, issued_at, contact_name, contact_email, client_id, clients(id, name, email, phone)')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(paid,void,refunded,draft)')
      .order('due_date', { ascending: true, nullsFirst: false })
    if (entityId) invQ = invQ.eq('entity_id', entityId)
    const { data: invoices } = await invQ

    // Completed bookings where payment_status != paid and no invoice yet.
    // `status` and `payment_status` are independent: `status` tracks the
    // job/team-pay lifecycle (POST /api/finance/payroll flips a booking
    // straight from 'completed' to 'paid' once the TEAM MEMBER is paid,
    // regardless of whether the CLIENT ever paid), while `payment_status`
    // tracks the client's own payment separately (unpaid/partial/paid,
    // set by Stripe/mark-paid/bank-transaction-match). Filtering only on
    // `status='completed'` meant the moment payroll ran on a booking it
    // vanished from Accounts Receivable entirely, even with
    // payment_status still 'unpaid' -- real client debt going dark with no
    // collections visibility. Include 'paid' too; it's still gated by the
    // same not-paid/refunded payment_status check below.
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, price, start_time, payment_status, partial_payment_cents, client_id, clients(id, name, email, phone)')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'paid'])
      .not('payment_status', 'in', '(paid,refunded)')
      .is('route_id', null)
      .order('start_time', { ascending: true })

    type AgingRow = {
      source: 'invoice' | 'booking'
      id: string
      reference: string
      title: string | null
      client_name: string | null
      client_id: string | null
      total_cents: number
      balance_cents: number
      due_date: string | null
      days_past_due: number
      bucket: string
    }

    const rows: AgingRow[] = []

    for (const inv of invoices || []) {
      const balance = (inv.total_cents || 0) - (inv.amount_paid_cents || 0)
      if (balance <= 0) continue
      const dueDate = inv.due_date ? new Date(inv.due_date as string) : null
      const daysPast = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0
      const bucket = BUCKETS.find(b => daysPast >= b.minDays && daysPast <= b.maxDays)?.label || 'Current'
      const clientRaw = inv.clients as unknown
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { id: string; name: string } | null
      rows.push({
        source: 'invoice',
        id: inv.id,
        reference: inv.invoice_number,
        title: inv.title,
        client_name: client?.name || inv.contact_name,
        client_id: inv.client_id || client?.id || null,
        total_cents: inv.total_cents || 0,
        balance_cents: balance,
        due_date: inv.due_date,
        days_past_due: daysPast,
        bucket,
      })
    }

    for (const b of bookings || []) {
      const priceCents = Math.round(Number(b.price || 0)) // price is already cents
      if (priceCents <= 0) continue
      // A 'partial' booking already collected partial_payment_cents from the
      // client (set by payment-processor/Stripe/bank-match) -- only the
      // remainder is still receivable. Without this, every partially-paid
      // booking overstated AR by the amount the client already sent in.
      const received = b.payment_status === 'partial' ? Math.max(0, Math.round(Number(b.partial_payment_cents) || 0)) : 0
      const balanceCents = priceCents - received
      if (balanceCents <= 0) continue
      const daysPast = b.start_time ? Math.max(0, Math.floor((today.getTime() - new Date(b.start_time as string).getTime()) / 86400000)) : 0
      const bucket = BUCKETS.find(bu => daysPast >= bu.minDays && daysPast <= bu.maxDays)?.label || 'Current'
      const clientRaw = b.clients as unknown
      const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { id: string; name: string } | null
      rows.push({
        source: 'booking',
        id: b.id,
        reference: `B-${b.id.slice(0, 8)}`,
        title: null,
        client_name: client?.name || null,
        client_id: b.client_id || client?.id || null,
        total_cents: priceCents,
        balance_cents: balanceCents,
        due_date: b.start_time,
        days_past_due: daysPast,
        bucket,
      })
    }

    rows.sort((a, b) => b.days_past_due - a.days_past_due)

    const bucketTotals = BUCKETS.map(b => {
      const items = rows.filter(r => r.bucket === b.label)
      return { label: b.label, count: items.length, total_cents: items.reduce((a, x) => a + x.balance_cents, 0) }
    })
    const grandTotal = rows.reduce((a, r) => a + r.balance_cents, 0)

    return NextResponse.json({ rows, buckets: bucketTotals, total_cents: grandTotal })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/ar-aging', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
