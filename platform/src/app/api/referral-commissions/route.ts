/**
 * Referral commissions ledger. Tenant-scoped. Ported from nycmaid.
 *
 * GET ?referrer_id=... — list a referrer's commissions. Requires a referrer
 *                        session token (from /api/referrers/auth/verify)
 *                        whose rid matches the requested referrer_id.
 * GET (no params, admin session) — list all commissions for the tenant.
 * POST (admin) — create a commission for a booking with a referrer_id.
 * PUT (admin) — update status; marking 'paid' bumps referrer.total_paid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { postCommissionAccrual, postCommissionPayment } from '@/lib/finance/post-adjustments'
import { getReferrerAuth } from '@/lib/referrer-portal-auth'
import { bumpReferrerTotalOrFlag } from '@/lib/referrer-ledger'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const referrerId = url.searchParams.get('referrer_id')
    const status = url.searchParams.get('status')

    // Referrer-portal path. Was previously reachable with the bare
    // referrer_id and no session check -- referrer_id is a plain row id, not
    // a secret, and was independently obtainable with zero auth from
    // GET /api/referrers?code=... (any public referral link), so anyone who
    // ever saw a referral link could pull this referrer's full commission
    // history, including the client_name and booking price/date of every
    // person they referred (third-party PII, not just the referrer's own
    // data). Require the same referrer session token the earnings dashboard
    // (/api/referrers/[code]) already gates on, and confirm it actually
    // owns this referrer_id.
    if (referrerId) {
      const auth = getReferrerAuth(request)
      if (!auth || auth.rid !== referrerId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: refRow } = await supabaseAdmin
        .from('referrers')
        .select('tenant_id')
        .eq('id', referrerId)
        .maybeSingle()
      if (!refRow || refRow.tenant_id !== auth.tid) {
        return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
      }

      let query = supabaseAdmin
        .from('referral_commissions')
        .select('*, referrers(name, email, referral_code), bookings(start_time, price)')
        .eq('tenant_id', refRow.tenant_id)
        .eq('referrer_id', referrerId)
        .order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)
      const { data, error } = await query
      if (error) throw error
      return NextResponse.json(data)
    }

    // Admin-session path. Was previously reachable by ANY authenticated
    // team member via getTenantForRequest() alone -- staff (no
    // referrals.view by default) could list every commission for the
    // tenant, including third-party client_name/booking price/date data.
    // Same gap already closed on the sibling GET /api/referrals.
    const { tenant, error: authError } = await requirePermission('referrals.view')
    if (authError) return authError
    const { tenantId } = tenant
    let query = supabaseAdmin
      .from('referral_commissions')
      .select('*, referrers(name, email, referral_code), bookings(start_time, price)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Commissions GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Same gap as GET above -- staff/manager (no referrals.create by
    // default) could otherwise mint a commission for any booking.
    const { tenant, error: authError } = await requirePermission('referrals.create')
    if (authError) return authError
    const { tenantId } = tenant
    const { booking_id } = await request.json()
    if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, price, referrer_id, clients(name, email)')
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!booking.referrer_id) return NextResponse.json({ error: 'Booking has no referrer' }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('referral_commissions')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Commission already exists for this booking' }, { status: 409 })

    const { data: ref } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, commission_rate, total_earned')
      .eq('id', booking.referrer_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!ref) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })

    const rate = Number(ref.commission_rate) || 0.10
    const gross = booking.price || 0
    const commission = Math.round(gross * rate)
    const client = booking.clients as unknown as { name?: string } | null

    const { data: commissionRow, error } = await supabaseAdmin
      .from('referral_commissions')
      .insert({
        tenant_id: tenantId,
        booking_id,
        referrer_id: booking.referrer_id,
        client_name: client?.name || null,
        gross_amount_cents: gross,
        commission_rate: rate,
        commission_cents: commission,
        status: 'pending',
      })
      .select()
      .single()
    // Duplicate booking_id -- a retried/double-clicked create for a booking
    // that already got a commission between our `existing` check above and
    // this insert. Treat as the same 409 the check itself returns, instead
    // of double-counting referrer.total_earned below. See migration
    // 066_unique_referral_commissions_booking.sql.
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Commission already exists for this booking' }, { status: 409 })
    }
    if (error) throw error

    // Accrue the commission expense/payable to the ledger.
    postCommissionAccrual({ tenantId, commissionId: commissionRow.id })
      .catch(err => console.error('[ref-comm] accrual post failed:', err))

    // CAS retry, not a plain read-then-write -- two different bookings for
    // this same referrer completing concurrently would otherwise both read
    // the same starting total_earned and the second write clobbers the
    // first (the UNIQUE(booking_id) dedup above only guards the SAME
    // booking being double-submitted, not two different ones racing here).
    // OrFlag: a failed bump (retries exhausted) opens an admin_tasks row
    // instead of silently leaving total_earned behind this real commission.
    await bumpReferrerTotalOrFlag(tenantId, ref.id, 'total_earned', commission, {
      relatedType: 'referral_commission',
      relatedId: commissionRow.id,
      referrerName: ref.name,
    })

    if (ref.email) {
      notify({
        tenantId,
        type: 'follow_up',
        title: 'Referral commission earned',
        message: `${ref.name}: $${(commission / 100).toFixed(2)} commission from ${client?.name || 'a booking'}.`,
        channel: 'email',
        recipientType: 'admin',
        metadata: { referrer_id: ref.id, commission, booking_id },
      }).catch(err => console.error('[ref-comm] notify failed:', err))
    }

    return NextResponse.json({
      commission: commissionRow,
      message: `Commission of $${(commission / 100).toFixed(2)} created for ${ref.name}`,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Commissions POST error:', err)
    return NextResponse.json({ error: 'Failed to create commission' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    // Same gap as GET/POST above, and the most severe -- staff/manager (no
    // referrals.payout by default; only admin/owner have it) could mark any
    // commission 'paid', bumping referrer.total_paid and posting a real
    // payment to the finance ledger with no such authority.
    const { tenant, error: authError } = await requirePermission('referrals.payout')
    if (authError) return authError
    const { tenantId } = tenant
    const { id, status, paid_via } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = { status }
    const markingPaid = status === 'paid'
    if (markingPaid) {
      updates.paid_at = new Date().toISOString()
      updates.paid_via = paid_via || 'zelle'
    }

    // `.neq('status', 'paid')` makes the paid transition a DB-level
    // compare-and-swap: only the request that actually flips pending/void ->
    // paid gets a row back. A double-click on "Pay", a network retry, or two
    // concurrent requests for the same commission would otherwise each
    // re-read the referrer's total_paid before either write committed and
    // both add commission_cents -- double-counting the payout and
    // double-posting the ledger (postCommissionPayment below), even though
    // no second real payment was ever made.
    let query = supabaseAdmin.from('referral_commissions').update(updates).eq('id', id).eq('tenant_id', tenantId)
    if (markingPaid) query = query.neq('status', 'paid')
    const { data, error } = await query.select().maybeSingle()
    if (error) throw error

    if (!data) {
      // Either no row matches this id/tenant, or (mark-paid only) it was
      // already paid -- tell them apart without re-applying the total_paid
      // bump or re-posting the ledger.
      const { data: current } = await supabaseAdmin
        .from('referral_commissions')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(current)
    }

    if (markingPaid) {
      // CAS retry, not a plain read-then-write -- two different commissions
      // for this same referrer both being marked paid concurrently would
      // otherwise read the same starting total_paid and the second write
      // clobbers the first (the `.neq('status','paid')` guard above only
      // protects the same commission row from being double-paid, not the
      // referrer's aggregate total_paid across different rows).
      // OrFlag: a failed bump opens an admin_tasks row instead of silently
      // leaving total_paid behind this real payout.
      await bumpReferrerTotalOrFlag(tenantId, data.referrer_id as string, 'total_paid', data.commission_cents as number, {
        relatedType: 'referral_commission',
        relatedId: data.id as string,
      })
      // Marking paid clears the payable against cash in the ledger.
      postCommissionPayment({ tenantId, commissionId: data.id })
        .catch(err => console.error('[ref-comm] payment post failed:', err))
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Commissions PUT error:', err)
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 })
  }
}
