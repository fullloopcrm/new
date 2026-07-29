/**
 * Accounts Receivable aging — single source of truth for "what's owed to us".
 * Unpaid invoices + unpaid completed bookings (excluding refunded/void/draft
 * and already-routed bookings), bucketed by days past due.
 *
 * Extracted from /api/finance/ar-aging so every other surface that shows an
 * "Outstanding"/"AR" figure (dashboard homepage, Finance Overview) reads the
 * same number instead of recomputing its own raw booking-price sum — same
 * fix pattern as ledgerProfitAndLoss() for revenue.
 */
import { tenantDb } from '@/lib/tenant-db'

export const AR_AGING_BUCKETS = [
  { label: 'Current', minDays: 0, maxDays: 30 },
  { label: '31-60', minDays: 31, maxDays: 60 },
  { label: '61-90', minDays: 61, maxDays: 90 },
  { label: '90+', minDays: 91, maxDays: Infinity },
]

export interface ArAgingRow {
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

export interface ArAgingResult {
  rows: ArAgingRow[]
  buckets: { label: string; count: number; total_cents: number }[]
  total_cents: number
}

export async function getArAging(tenantId: string, entityId?: string | null): Promise<ArAgingResult> {
  const db = tenantDb(tenantId)
  const today = new Date()

  let invQ = db
    .from('invoices')
    .select('id, invoice_number, title, total_cents, amount_paid_cents, due_date, issued_at, contact_name, contact_email, client_id, clients(id, name, email, phone)')
    .not('status', 'in', '(paid,void,refunded,draft)')
    .order('due_date', { ascending: true, nullsFirst: false })
  if (entityId) invQ = invQ.eq('entity_id', entityId)
  const { data: invoices } = await invQ

  const { data: bookings } = await db
    .from('bookings')
    .select('id, price, start_time, payment_status, client_id, clients(id, name, email, phone)')
    // 'paid' is a valid terminal booking status alongside 'completed' (same
    // established pattern as team-portal/earnings, cron/lifecycle, etc.) —
    // a payroll run flipping a booking to 'paid' must not silently drop it
    // out of AR aging.
    .in('status', ['completed', 'paid'])
    .not('payment_status', 'in', '(paid,refunded)')
    .is('route_id', null)
    .order('start_time', { ascending: true })

  const rows: ArAgingRow[] = []

  for (const inv of invoices || []) {
    const balance = (inv.total_cents || 0) - (inv.amount_paid_cents || 0)
    if (balance <= 0) continue
    const dueDate = inv.due_date ? new Date(inv.due_date as string) : null
    const daysPast = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000)) : 0
    const bucket = AR_AGING_BUCKETS.find(b => daysPast >= b.minDays && daysPast <= b.maxDays)?.label || 'Current'
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
    const priceCents = Math.round(Number(b.price || 0))
    if (priceCents <= 0) continue
    const daysPast = b.start_time ? Math.max(0, Math.floor((today.getTime() - new Date(b.start_time as string).getTime()) / 86400000)) : 0
    const bucket = AR_AGING_BUCKETS.find(bu => daysPast >= bu.minDays && daysPast <= bu.maxDays)?.label || 'Current'
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

  const buckets = AR_AGING_BUCKETS.map(b => {
    const items = rows.filter(r => r.bucket === b.label)
    return { label: b.label, count: items.length, total_cents: items.reduce((a, x) => a + x.balance_cents, 0) }
  })
  const total_cents = rows.reduce((a, r) => a + r.balance_cents, 0)

  return { rows, buckets, total_cents }
}
