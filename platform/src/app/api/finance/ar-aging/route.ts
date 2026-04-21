/**
 * Accounts Receivable aging — unpaid invoices + unpaid completed bookings,
 * bucketed by days past due.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

const BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60', minDays: 31, maxDays: 60 },
  { label: '61-90', minDays: 61, maxDays: 90 },
  { label: '90+', minDays: 91, maxDays: Infinity },
]

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const today = new Date()

    // Unpaid invoices
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, title, total_cents, amount_paid_cents, due_date, issued_at, contact_name, contact_email, client_id, clients(id, name, email, phone)')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(paid,void,refunded,draft)')
      .order('due_date', { ascending: true, nullsFirst: false })

    // Completed bookings where payment_status != paid and no invoice yet
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, price, start_time, payment_status, client_id, clients(id, name, email, phone)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
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
      const priceCents = Math.round(Number(b.price || 0) * 100)
      if (priceCents <= 0) continue
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
        balance_cents: priceCents,
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
