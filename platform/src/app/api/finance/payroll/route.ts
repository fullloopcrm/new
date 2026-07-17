import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { postPayrollToLedger } from '@/lib/finance/post-labor'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    // Get all team members
    const { data: team } = await supabaseAdmin
      .from('team_members')
      .select('id, name, pay_rate, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Get completed unpaid bookings for each. Exclude bookings already
    // settled out-of-band (team_member_paid, e.g. a manual Zelle/cash payout
    // recorded via /api/admin/bookings/[id]/cleaner-payout) — otherwise their
    // hours/pay still show as pending here and a normal payroll run below
    // double-pays the team member for work already compensated.
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id, check_in_time, check_out_time, pay_rate, team_member_pay')
      .eq('tenant_id', tenantId)
      .in('status', ['completed'])
      .or('team_member_paid.is.null,team_member_paid.eq.false')

    const payroll = (team || []).map((member) => {
      const memberBookings = (bookings || []).filter((b) => b.team_member_id === member.id)
      let pendingHours = 0
      let pendingPay = 0
      memberBookings.forEach((b) => {
        const hours = (b.check_in_time && b.check_out_time)
          ? (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
          : 0
        pendingHours += hours
        // Flat per-job pay (bookings.team_member_pay, cents — set for
        // per-job/flat-fee comp, e.g. dumpster/junk/moving labor) is the
        // source of truth when present, same model as team-portal/earnings
        // and payroll-prep. Falls back to hours × rate only when no flat
        // amount was recorded (hourly-comp workers with no team_member_pay).
        pendingPay += b.team_member_pay && b.team_member_pay > 0
          ? b.team_member_pay / 100
          : hours * (b.pay_rate || member.pay_rate || 0)
      })
      return {
        ...member,
        pending_hours: Math.round(pendingHours * 100) / 100,
        pending_pay: Math.round(pendingPay * 100) / 100,
        jobs: memberBookings.length,
      }
    })

    return NextResponse.json({ payroll })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { team_member_id, method, period_start, period_end } = await request.json()

    // `amount` here is the team member's pending_pay from GET above — the sum
    // of completed-but-unpaid bookings. The old code inserted payroll_payments
    // unconditionally, THEN flipped those bookings to 'paid' with no check on
    // the outcome. A double-click on "Run Payroll" or a retried request raced
    // two inserts through before either booking flipped status: the bookings
    // update naturally no-ops the second time (its own `eq('status',
    // 'completed')` filter excludes rows the first call already flipped), but
    // nothing stopped the SECOND payroll_payments row + ledger post from
    // recording the same pay a second time. Claim the bookings FIRST — only
    // the request that actually flips completed bookings to paid gets to
    // record the payment.
    //
    // Also scope the claim to the period being paid when the caller supplies
    // one: without it, this blind-flips EVERY completed booking for the team
    // member regardless of period_start/period_end, so paying one small
    // period silently marks unrelated, never-actually-paid bookings from
    // other periods as settled too — they drop out of payroll-prep's
    // status='completed' gross-pay window for good even though the crew was
    // never paid for that work. Mirrors payroll-prep's own from/to windowing
    // (gte/lte on start_time). No-period calls keep the prior blanket
    // behavior, same as the existing no-period dedup gap.
    let bookingsQuery = supabaseAdmin
      .from('bookings')
      .update({ status: 'paid' })
      .eq('tenant_id', tenantId)
      .eq('team_member_id', team_member_id)
      .eq('status', 'completed')
    if (period_start) bookingsQuery = bookingsQuery.gte('start_time', period_start)
    if (period_end) bookingsQuery = bookingsQuery.lte('start_time', period_end)
    const { data: claimedBookings, error: claimErr } = await bookingsQuery
      .select('id, check_in_time, check_out_time, pay_rate, team_member_pay')
    if (claimErr) {
      return NextResponse.json({ error: claimErr.message }, { status: 500 })
    }
    if (!claimedBookings || claimedBookings.length === 0) {
      return NextResponse.json(
        { error: 'No pending completed bookings to pay for this team member (already paid or none outstanding).' },
        { status: 409 },
      )
    }

    // The paid amount is always computed here from the bookings this call
    // actually claimed — never trusted from the request body. The old code
    // inserted whatever `amount` the caller sent (the frontend's own copy of
    // GET's pending_pay, computed client-side) straight into
    // payroll_payments with no server-side check that it matched the
    // bookings being flipped to paid, and that row is what
    // postPayrollToLedger posts to the ledger verbatim — anyone with
    // finance.payroll could submit an arbitrary amount and have it land in
    // the books. Mirrors GET's own flat-team_member_pay-wins-over-hours×rate
    // formula (falling back to the team member's own pay_rate, same as GET)
    // so the amount actually paid always matches what GET displayed as
    // pending for these exact bookings.
    const { data: memberRow } = await supabaseAdmin
      .from('team_members')
      .select('pay_rate')
      .eq('tenant_id', tenantId)
      .eq('id', team_member_id)
      .maybeSingle()
    const memberPayRate = Number(memberRow?.pay_rate) || 0

    let amountCents = 0
    for (const b of claimedBookings as Array<Record<string, unknown>>) {
      const checkIn = b.check_in_time as string | null
      const checkOut = b.check_out_time as string | null
      const hours = (checkIn && checkOut)
        ? (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000
        : 0
      const flatPayCents = Number(b.team_member_pay) || 0
      amountCents += flatPayCents > 0
        ? flatPayCents
        : Math.round(hours * (Number(b.pay_rate) || memberPayRate) * 100)
    }

    const { data, error } = await supabaseAdmin
      .from('payroll_payments')
      .insert({
        tenant_id: tenantId,
        team_member_id,
        amount: amountCents,
        method,
        period_start,
        period_end,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Post the wage payment to the ledger (account by HR employment type).
    if (data?.id) {
      postPayrollToLedger({ tenantId, payrollPaymentId: data.id })
        .catch(err => console.error('[payroll] ledger post failed:', err))
    }

    return NextResponse.json({ payment: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
