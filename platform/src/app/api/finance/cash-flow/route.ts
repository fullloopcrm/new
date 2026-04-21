/**
 * 4-week cash flow forecast.
 * Inflows: scheduled bookings, unpaid invoices with due date
 * Outflows: recurring expenses scheduled in window
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

function weekKey(d: Date): string {
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const weeks = Math.min(12, Math.max(1, Number(url.searchParams.get('weeks')) || 4))

    const now = new Date()
    const endDate = new Date(now.getTime() + weeks * 7 * 86400000)
    const nowIso = now.toISOString().slice(0, 10)
    const endIso = endDate.toISOString().slice(0, 10)
    const endTs = `${endIso}T23:59:59Z`

    const [{ data: upcomingBookings }, { data: openInvoices }, { data: recurring }] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id, price, start_time, payment_status')
        .eq('tenant_id', tenantId)
        .gte('start_time', now.toISOString())
        .lte('start_time', endTs)
        .not('status', 'in', '(cancelled,no_show)'),
      supabaseAdmin
        .from('invoices')
        .select('id, total_cents, amount_paid_cents, due_date')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,void,refunded,draft)')
        .gte('due_date', nowIso)
        .lte('due_date', endIso),
      supabaseAdmin
        .from('recurring_expenses')
        .select('id, label, amount_cents, frequency, next_due_date, start_date, active')
        .eq('tenant_id', tenantId)
        .eq('active', true),
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
      const price = Math.round(Number(b.price || 0) * 100)
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
      let cursor = new Date(startDate)
      if (cursor < now) {
        // Advance cursor until >= now
        while (cursor < now) cursor = advanceCursor(cursor, r.frequency as string)
      }
      while (cursor <= endDate) {
        const key = weekKey(cursor)
        const bucket = buckets.get(key)
        if (bucket) bucket.outflows_cents += amount
        cursor = advanceCursor(cursor, r.frequency as string)
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

function advanceCursor(d: Date, frequency: string): Date {
  const r = new Date(d)
  switch (frequency) {
    case 'daily': r.setUTCDate(r.getUTCDate() + 1); break
    case 'weekly': r.setUTCDate(r.getUTCDate() + 7); break
    case 'biweekly': r.setUTCDate(r.getUTCDate() + 14); break
    case 'monthly': r.setUTCMonth(r.getUTCMonth() + 1); break
    case 'quarterly': r.setUTCMonth(r.getUTCMonth() + 3); break
    case 'yearly': r.setUTCFullYear(r.getUTCFullYear() + 1); break
    default: r.setUTCDate(r.getUTCDate() + 30)
  }
  return r
}
