/**
 * Referral commissions ledger. Tenant-scoped. Ported from nycmaid.
 *
 * GET ?referrer_id=... — list a referrer's commissions (admin session
 *                        required; referrer portal now reads its own ledger
 *                        via the token-gated GET /api/referrers/[code]).
 * GET (no params, admin session) — list all commissions for the tenant.
 * POST (admin) — create a commission for a booking with a referrer_id.
 * PUT (admin) — update status; marking 'paid' bumps referrer.total_paid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { requireAdmin } from '@/lib/require-admin'
import { postCommissionAccrual, postCommissionPayment } from '@/lib/finance/post-adjustments'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const referrerId = url.searchParams.get('referrer_id')
    const status = url.searchParams.get('status')

    // referrer_id path used to be reachable with no session at all (any
    // caller who had/guessed a referrer UUID could pull their full
    // commission ledger — client names + amounts). The referrer portal now
    // goes through the Bearer-token-gated GET /api/referrers/[code] instead
    // (which already scopes commissions to the verified referrer), so
    // nothing legitimate relies on this being public. Require an admin
    // session, same bar as the no-param path below.
    if (referrerId) {
      const authError = await requireAdmin()
      if (authError) return authError

      const { data: refRow } = await supabaseAdmin
        .from('referrers')
        .select('tenant_id')
        .eq('id', referrerId)
        .maybeSingle()
      if (!refRow) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })

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

    // Admin-session path.
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
    if (error) {
      // The maybeSingle() check above is a fast path, not the guard -- two
      // concurrent requests for the same booking can both pass it before
      // either inserts. referral_commissions_booking_unique (booking_id)
      // is the actual guard: the loser hits 23505 here and should get the
      // same friendly "already exists" response, not a raw 500.
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Commission already exists for this booking' }, { status: 409 })
      }
      throw error
    }

    // Accrue the commission expense/payable to the ledger.
    postCommissionAccrual({ tenantId, commissionId: commissionRow.id })
      .catch(err => console.error('[ref-comm] accrual post failed:', err))

    await supabaseAdmin
      .from('referrers')
      .update({ total_earned: (ref.total_earned || 0) + commission })
      .eq('id', ref.id)
      .eq('tenant_id', tenantId)

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
    const { tenant, error: authError } = await requirePermission('referrals.payout')
    if (authError) return authError
    const { tenantId } = tenant
    const { id, status, paid_via } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = { status }

    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
      updates.paid_via = paid_via || 'zelle'

      // Marking paid credits referrers.total_paid (surfaced in tax-export
      // and finance/reports) — a real financial figure, not just a status
      // label. The old code read the commission/referrer, unconditionally
      // added commission_cents to total_paid, then updated the commission
      // row's status with no check that it wasn't already 'paid'. A
      // double-click or a retried PUT for the same id credited total_paid
      // a second time for money that was only paid once. Claim the
      // transition atomically — only credit total_paid if this call is the
      // one that actually moves the row out of 'paid'.
      const { data: claimed } = await supabaseAdmin
        .from('referral_commissions')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .neq('status', 'paid')
        .select()
        .maybeSingle()
      if (!claimed) {
        return NextResponse.json({ error: 'Commission already marked paid' }, { status: 409 })
      }

      const { data: ref } = await supabaseAdmin
        .from('referrers')
        .select('total_paid')
        .eq('id', claimed.referrer_id)
        .eq('tenant_id', tenantId)
        .single()
      if (ref) {
        await supabaseAdmin
          .from('referrers')
          .update({ total_paid: (ref.total_paid || 0) + (claimed.commission_cents as number) })
          .eq('id', claimed.referrer_id)
          .eq('tenant_id', tenantId)
      }

      // Marking paid clears the payable against cash in the ledger.
      postCommissionPayment({ tenantId, commissionId: claimed.id })
        .catch(err => console.error('[ref-comm] payment post failed:', err))

      return NextResponse.json(claimed)
    }

    const { data, error } = await supabaseAdmin
      .from('referral_commissions')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Commissions PUT error:', err)
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 })
  }
}
