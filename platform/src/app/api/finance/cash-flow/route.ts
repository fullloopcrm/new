/**
 * 4-week cash flow forecast.
 * Inflows: scheduled bookings, unpaid invoices with due date
 * Outflows: recurring expenses scheduled in window
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'

function weekKey(d: Date): string {
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-injects .eq('tenant_id', tenantId) on every read below.
    // bookings/invoices/recurring_expenses all carry tenant_id; the optional
    // entity_id filter stays as a WITHIN-tenant scope, not a tenant boundary.
    const db = tenantDb(tenantId)
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)
    const weeks = Math.min(12, Math.max(1, Number(url.searchParams.get('weeks')) || 4))

    const now = new Date()
    const endDate = new Date(now.getTime() + weeks * 7 * 86400000)
    const nowIso = now.toISOString().slice(0, 10)
    const endIso = endDate.toISOString().slice(0, 10)
    const endTs = `${endIso}T23:59:59Z`

    // bookings is tenant-level (no entity_id); invoices + recurring_expenses take the filter.
    const bookingsQ = db
      .from('bookings')
      .select('id, price, start_time, payment_status')
      .gte('start_time', now.toISOString())
      .lte('start_time', endTs)
      .not('status', 'in', '(cancelled,no_show)')

    let invoicesQ = db
      .from('invoices')
      .select('id, total_cents, amount_paid_cents, due_date')
      .not('status', 'in', '(paid,void,refunded,draft)')
      .gte('due_date', nowIso)
      .lte('due_date', endIso)
    if (entityId) invoicesQ = invoicesQ.eq('entity_id', entityId)

    let recurringQ = db
      .from('recurring_expenses')
      .select('id, label, amount_cents, frequency, next_due_date, start_date, active')
      .eq('active', true)
    if (entityId) recurringQ = recurringQ.eq('entity_id', entityId)

    const [{ data: upcomingBookings }, { data: openInvoices }, { data: recurring }] = await Promise.all([
      bookingsQ, invoicesQ, recurringQ,
    ])

    // Build weekly buckets
    const buckets = new Map<string, { week_start: string; inflows_cents: number; outflows_cents: number; net_cents: number }>()
    for (let i = 0; i < weeks; i++) {
      const weekDate = new Date(now.getTime() + i * 7 * 86400000)
      const key = weekKey(weekDate)
      buckets.set(key, { week_start: key, inflows_cents: 0, outflows_cents: 0, net_cents: 0 })
    }

    for (const b of upcomingBookings || []) {
      if (b.payment_status === 'paid') continue
      // bookings.price is already in cents — no ×100 (that over-projected 100×).
      const price = Math.round(Number(b.price || 0))
      if (!price) continue
      const key = weekKey(new Date(b.start_time as string))
      const bucket = buckets.get(key)
      if (bucket) bucket.inflows_cents += price
    }

    for (const inv of openInvoices || []) {
      const balance = (inv.total_cents || 0) - (inv.amount_paid_cents || 0)
      if (balance <= 0 || !inv.due_date) continue
      const key = weekKey(new Date(inv.due_date as string))
      const bucket = buckets.get(key)
      if (bucket) bucket.inflows_cents += balance
    }

    // Recurring expenses: walk forward, apply at each occurrence within window
    for (const r of recurring || []) {
      const amount = Number(r.amount_cents) || 0
      if (!amount) continue
      const startDate = r.next_due_date
        ? new Date(r.next_due_date as string)
        : r.start_date
        ? new Date(r.start_date as string)
        : now
      // Anchor day-of-month captured once from the recurrence's TRUE anchor
      // (start_date — the only field ever written by the create-form UI,
      // same confirmed source as cron/recurring-expenses' fix) so
      // monthly/quarterly ticks never chain off a previous tick's own
      // possibly-overflowed day. Falls back to next_due_date/startDate's
      // own day if start_date is missing.
      const anchorSource = r.start_date || r.next_due_date
      const anchorDay = anchorSource ? new Date(anchorSource as string).getUTCDate() : startDate.getUTCDate()
      let cursor = new Date(startDate)
      if (cursor < now) {
        // Advance cursor until >= now
        while (cursor < now) cursor = advanceCursor(cursor, r.frequency as string, anchorDay)
      }
      while (cursor <= endDate) {
        const key = weekKey(cursor)
        const bucket = buckets.get(key)
        if (bucket) bucket.outflows_cents += amount
        cursor = advanceCursor(cursor, r.frequency as string, anchorDay)
      }
    }

    const weeklyRows = Array.from(buckets.values())
      .map(b => ({ ...b, net_cents: b.inflows_cents - b.outflows_cents }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start))

    return NextResponse.json({
      weeks: weeklyRows,
      totals: {
        inflows_cents: weeklyRows.reduce((a, w) => a + w.inflows_cents, 0),
        outflows_cents: weeklyRows.reduce((a, w) => a + w.outflows_cents, 0),
        net_cents: weeklyRows.reduce((a, w) => a + w.net_cents, 0),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/cash-flow', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function advanceCursor(d: Date, frequency: string, anchorDay: number): Date {
  const r = new Date(d)
  switch (frequency) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); break
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); break
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); break
    case 'monthly':
    case 'quarterly': {
      // Zero the day before advancing months, then clamp back to the
      // ORIGINAL anchor day — not whatever `r`'s day drifted to. The old
      // `r.setUTCMonth(r.getUTCMonth() + N)` chained off the previous
      // tick's (possibly already-overflowed) result: a day-29/30/31
      // anchor that overflowed a short month (Jan 31 -> Feb 31 rolls to
      // Mar 3) became the new baseline for every tick after it within
      // this forecast walk, silently shifting the projected week for
      // every remaining occurrence.
      const months = frequency === 'monthly' ? 1 : 3
      r.setUTCDate(1)
      r.setUTCMonth(r.getUTCMonth() + months)
      const lastDayOfMonth = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()
      r.setUTCDate(Math.min(anchorDay, lastDayOfMonth))
      break
    }
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); break
    default: r.setUTCDate(r.getUTCDate() + 30)
  }
  return r
}
