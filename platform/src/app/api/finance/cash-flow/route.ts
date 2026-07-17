/**
 * 4-week cash flow forecast.
 * Inflows: scheduled bookings, unpaid invoices with due date
 * Outflows: recurring expenses scheduled in window
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
    const url = new URL(request.url)
    const entityId = entityIdFromUrl(url)
    const weeks = Math.min(12, Math.max(1, Number(url.searchParams.get('weeks')) || 4))

    const now = new Date()
    const endDate = new Date(now.getTime() + weeks * 7 * 86400000)
    const nowIso = now.toISOString().slice(0, 10)
    const endIso = endDate.toISOString().slice(0, 10)
    const endTs = `${endIso}T23:59:59Z`

    // bookings is tenant-level (no entity_id); invoices + recurring_expenses take the filter.
    const bookingsQ = supabaseAdmin
      .from('bookings')
      .select('id, price, start_time, payment_status')
      .eq('tenant_id', tenantId)
      .gte('start_time', now.toISOString())
      .lte('start_time', endTs)
      .not('status', 'in', '(cancelled,no_show)')

    let invoicesQ = supabaseAdmin
      .from('invoices')
      .select('id, total_cents, amount_paid_cents, due_date')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(paid,void,refunded,draft)')
      .gte('due_date', nowIso)
      .lte('due_date', endIso)
    if (entityId) invoicesQ = invoicesQ.eq('entity_id', entityId)

    let recurringQ = supabaseAdmin
      .from('recurring_expenses')
      .select('id, label, amount_cents, frequency, next_due_date, start_date, active')
      .eq('tenant_id', tenantId)
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
      // Anchor day-of-month comes from start_date (the immutable original
      // anchor), not next_due_date -- next_due_date may itself already be
      // drifted for a row created before the cron's advance() fix.
      const anchorDay = r.start_date ? new Date(r.start_date as string).getUTCDate() : startDate.getUTCDate()
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

// Same permanent-drift bug class as cron/recurring-expenses' advance() (see
// that file's advanceMonthly comment): the old monthly/quarterly branches
// chained setUTCMonth() off the previous cursor, so a day-29/30/31 anchor's
// first short-month overflow (Jan 31 -> setUTCMonth overflows Feb 31 into
// Mar 3) became the new baseline for every later tick within this forecast
// walk, misplacing the outflow into the wrong week bucket. Fixed by
// re-deriving the day-of-month from the recurrence's original anchor
// (start_date) every tick, clamped to the target month's last day, instead
// of carrying the previous (possibly-already-overflowed) day forward.
export function advanceCursor(d: Date, frequency: string, anchorDay: number): Date {
  const r = new Date(d)
  switch (frequency) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); return r
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); return r
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); return r
    case 'monthly': return advanceMonthly(r, anchorDay, 1)
    case 'quarterly': return advanceMonthly(r, anchorDay, 3)
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); return r
    default: r.setUTCDate(r.getUTCDate() + 30); return r
  }
}

function advanceMonthly(current: Date, anchorDay: number, monthsStep: number): Date {
  const year = current.getUTCFullYear()
  const month = current.getUTCMonth() + monthsStep
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(anchorDay, daysInMonth)))
}
