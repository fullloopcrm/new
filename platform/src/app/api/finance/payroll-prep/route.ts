/**
 * Payroll / 1099 prep — per team member gross pay + hours + payouts,
 * plus annual 1099-flag when year-to-date hits $600.
 *
 * GET /api/finance/payroll-prep?from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET /api/finance/payroll-prep?year=YYYY  (for 1099 year-end)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  try {
    // finance.payroll, not finance.view — this response includes each team
    // member's SSN last-4 and EIN (tax_ssn_last4/tax_ein below). finance.view
    // is the read-only P&L/revenue tier a 'manager' role holds without
    // finance.payroll; gating this on finance.view let that role pull every
    // contractor's tax ID even though it can't run payroll (mark-paid,
    // POST /api/finance/payroll correctly require finance.payroll for the
    // same data class).
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.payroll')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    let from: string, to: string
    if (year) {
      from = `${year}-01-01`
      to = `${year}-12-31`
    } else {
      const now = new Date()
      from = url.searchParams.get('from') || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
      to = url.searchParams.get('to') || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    }
    const toTs = `${to}T23:59:59Z`

    // No status/active filter on purpose: this seeds rowMap, and anyone NOT
    // in rowMap has their bookings silently skipped by the `if (!row)
    // continue` below -- for a 1099/payroll report that's a real compliance
    // bug, not a UX nicety. team_members.active is also a stale, never-written
    // import snapshot column (see e33f55ef / migration
    // 2026_07_17_team_members_active_column_backfill_PROPOSED.sql) that had
    // drifted from `status` for a live sample of the roster -- filtering on
    // it here was dropping currently-active contractors' gross pay from
    // their own payroll/1099 report entirely. Filtering on `status` instead
    // would fix that but reintroduce the same class of bug for a DIFFERENT
    // case this report specifically needs: a contractor terminated mid-year
    // still earned $600+ and still needs their 1099 flagged and their
    // balance_owed reconciled after they're gone. Fetch every team member
    // for the tenant; anyone with zero bookings/payouts in the window just
    // renders as a zero-pay row.
    const { data: teamMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, name, phone, tax_classification, tax_ein, tax_ssn_last4, tax_business_name, tax_address, tax_city, tax_state, tax_zip')
      .eq('tenant_id', tenantId)

    // Include 'paid' alongside 'completed': POST /api/finance/payroll (bulk
    // payroll) flips a claimed booking's own status straight to 'paid' with
    // no booking_id link anywhere else (its payroll_payments row is one
    // lump sum per run, not per-booking) -- a booking excluded here the
    // moment payroll runs on it would silently vanish from both this
    // period's gross pay AND (see thresholdYear below) the contractor's
    // real YTD earnings for the 1099 threshold, even though the money was
    // genuinely earned and paid. 'paid' rows are counted as already-settled
    // via the status check in the accumulation loop below, same as
    // 'completed' rows already flagged team_member_paid via cleaner-payout.
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, team_member_id, team_member_pay, actual_hours, start_time, status')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'paid'])
      .gte('start_time', from)
      .lte('start_time', toTs)

    const { data: payouts } = await supabaseAdmin
      .from('team_member_payouts')
      .select('team_member_id, amount_cents, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lte('created_at', toTs)

    // The 1099 flag is documented (see file header) as a year-to-date signal,
    // but the caller (finance/reports) defaults `from`/`to` to the CURRENT
    // MONTH, not the calendar year -- computing hits_1099_threshold off the
    // requested `bookings` window meant the default view silently answered
    // "did this contractor earn $600+ THIS MONTH", which both false-negatives
    // (a contractor over $600 YTD but under it this month never gets flagged)
    // and drifts from the one-time-per-year IRS threshold this exists to
    // surface. Always resolve the flag from a real Jan 1 - Dec 31 window for
    // the year the requested period falls in, reusing the already-fetched
    // `bookings` rows when the caller already requested exactly that full
    // year (the `year=` param path) instead of querying twice.
    const thresholdYear = year || String(new Date(`${to}T00:00:00Z`).getUTCFullYear())
    const isFullYearRequest = from === `${thresholdYear}-01-01` && to === `${thresholdYear}-12-31`
    const ytdPayByMember = new Map<string, number>()
    if (isFullYearRequest) {
      for (const b of bookings || []) {
        if (!b.team_member_id) continue
        ytdPayByMember.set(b.team_member_id, (ytdPayByMember.get(b.team_member_id) || 0) + Math.round(Number(b.team_member_pay || 0)))
      }
    } else {
      const { data: ytdBookings } = await supabaseAdmin
        .from('bookings')
        .select('team_member_id, team_member_pay')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'paid'])
        .gte('start_time', `${thresholdYear}-01-01`)
        .lte('start_time', `${thresholdYear}-12-31T23:59:59Z`)
      for (const b of ytdBookings || []) {
        if (!b.team_member_id) continue
        ytdPayByMember.set(b.team_member_id, (ytdPayByMember.get(b.team_member_id) || 0) + Math.round(Number(b.team_member_pay || 0)))
      }
    }

    type Row = {
      team_member_id: string
      name: string
      phone: string | null
      tax_classification: string | null
      tax_ein: string | null
      tax_ssn_last4: string | null
      tax_business_name: string | null
      tax_address_full: string | null
      hours: number
      jobs: number
      gross_pay_cents: number
      paid_out_cents: number
      balance_owed_cents: number
      hits_1099_threshold: boolean
    }

    const rowMap = new Map<string, Row>()
    for (const tm of teamMembers || []) {
      const addr = [tm.tax_address, tm.tax_city, tm.tax_state, tm.tax_zip].filter(Boolean).join(', ')
      rowMap.set(tm.id, {
        team_member_id: tm.id,
        name: tm.name || 'Unknown',
        phone: tm.phone,
        tax_classification: tm.tax_classification,
        tax_ein: tm.tax_ein,
        tax_ssn_last4: tm.tax_ssn_last4,
        tax_business_name: tm.tax_business_name,
        tax_address_full: addr || null,
        hours: 0,
        jobs: 0,
        gross_pay_cents: 0,
        paid_out_cents: 0,
        balance_owed_cents: 0,
        hits_1099_threshold: false,
      })
    }

    for (const b of bookings || []) {
      if (!b.team_member_id) continue
      const row = rowMap.get(b.team_member_id)
      if (!row) continue
      row.hours += Number(b.actual_hours) || 0
      row.jobs += 1
      const payCents = Math.round(Number(b.team_member_pay || 0)) // already cents
      row.gross_pay_cents += payCents
      // 'paid' means bulk payroll already claimed and paid this booking
      // (POST /api/finance/payroll) -- count it toward paid_out_cents here
      // since that flow never writes a per-booking team_member_payouts row
      // for the payouts query below to pick up.
      if (b.status === 'paid') row.paid_out_cents += payCents
    }

    for (const p of payouts || []) {
      if (!p.team_member_id) continue
      // team_member_payouts.status has never actually held 'paid' /
      // 'succeeded' / 'completed' -- every real write path (webhooks/stripe,
      // payment-processor.ts, admin/bookings/[id]/cleaner-payout) inserts a
      // row only AFTER the money already moved, and stamps `status` with the
      // MECHANISM ('transferred' for Stripe Connect, or the payout method
      // 'zelle'/'venmo'/'cashapp'/'cash'/'other' for a manual payout) --
      // never a completion state. That allow-list matched none of them, so
      // every payout ever recorded here was silently excluded from
      // paid_out_cents: balance_owed_cents then permanently overstated what
      // a contractor was still owed by the FULL amount already paid out to
      // them, for every team member ever paid through either real payout
      // path. Same as finance/summary's own payouts sum (route.ts:95),
      // which never filtered on status at all -- match that: every row in
      // this table is a real payout, count it.
      const row = rowMap.get(p.team_member_id)
      if (!row) continue
      row.paid_out_cents += Number(p.amount_cents) || 0
    }

    const rows = Array.from(rowMap.values()).map(r => ({
      ...r,
      balance_owed_cents: Math.max(0, r.gross_pay_cents - r.paid_out_cents),
      hits_1099_threshold: (ytdPayByMember.get(r.team_member_id) || 0) >= 60000, // $600 YTD, in cents
    })).sort((a, b) => b.gross_pay_cents - a.gross_pay_cents)

    const totals = {
      total_hours: rows.reduce((a, r) => a + r.hours, 0),
      total_jobs: rows.reduce((a, r) => a + r.jobs, 0),
      total_gross_cents: rows.reduce((a, r) => a + r.gross_pay_cents, 0),
      total_paid_out_cents: rows.reduce((a, r) => a + r.paid_out_cents, 0),
      total_balance_cents: rows.reduce((a, r) => a + r.balance_owed_cents, 0),
      contractors_above_1099_threshold: rows.filter(r => r.hits_1099_threshold).length,
    }

    return NextResponse.json({ period: { from, to }, rows, totals })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/payroll-prep', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
