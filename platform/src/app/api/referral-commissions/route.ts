/**
 * Referral commissions ledger. Tenant-scoped. Ported from nycmaid.
 *
 * GET ?referrer_id=... — list a referrer's commissions (public: the referrer
 *                        portal calls this with their own ID).
 * GET (no params, admin session) — list all commissions for the tenant.
 * POST (admin) — create a commission for a booking with a referrer_id.
 * PUT (admin) — update status; marking 'paid' bumps referrer.total_paid
 *               (atomically claimed so a double-submit can't double-credit).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { postCommissionAccrual, postCommissionPayment } from '@/lib/finance/post-adjustments'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const referrerId = url.searchParams.get('referrer_id')
    const status = url.searchParams.get('status')

    // Referrer-portal path: accept with referrer_id alone (no admin session).
    // Scope the query by the tenant that owns the referrer.
    if (referrerId) {
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
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
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
    if (error) throw error

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
    const { tenantId } = await getTenantForRequest()
    const { id, status, paid_via } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = { status }
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
      updates.paid_via = paid_via || 'zelle'
    }

    // Marking 'paid' bumps referrer.total_paid — a plain update() would let a
    // double-click or retried request re-apply that bump every time it's
    // called (the finance-ledger side is separately idempotent via
    // journalEntryExists, but this counter isn't). Claim the transition
    // atomically: only a row that isn't already 'paid' can flip to 'paid'. A
    // concurrent/duplicate request that loses the race gets null back and is
    // treated as already-handled instead of double-crediting the referrer.
    let query = supabaseAdmin
      .from('referral_commissions')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (status === 'paid') query = query.neq('status', 'paid')
    const { data, error } = await query.select().maybeSingle()
    if (error) throw error

    if (!data) {
      if (status !== 'paid') return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const { data: current, error: curErr } = await supabaseAdmin
        .from('referral_commissions')
        .select()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (curErr) throw curErr
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(current)
    }

    if (status === 'paid') {
      const { data: ref } = await supabaseAdmin
        .from('referrers')
        .select('total_paid')
        .eq('id', data.referrer_id)
        .eq('tenant_id', tenantId)
        .single()
      if (ref) {
        await supabaseAdmin
          .from('referrers')
          .update({ total_paid: (ref.total_paid || 0) + (data.commission_cents as number) })
          .eq('id', data.referrer_id)
          .eq('tenant_id', tenantId)
      }
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
