import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// GET /api/admin/comhub/contacts/[id]/context
// Enriched info for the right-side panel: contact + linked client + team_member +
// recent bookings + counters.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const { data: contact, error: cErr } = await db
    .from('comhub_contacts')
    .select('id, name, phone, email, client_id, team_member_id, tag')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (cErr || !contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  let clientId = contact.client_id as string | null
  let teamMemberId = contact.team_member_id as string | null

  if (!clientId && contact.phone) {
    const last10 = contact.phone.replace(/\D/g, '').slice(-10)
    const { data: matched } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('phone', `%${last10}%`)
      .limit(1)
    if (matched && matched.length > 0) clientId = matched[0].id
  }
  if (!clientId && contact.email) {
    const { data: matched } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', contact.email)
      .limit(1)
    if (matched && matched.length > 0) clientId = matched[0].id
  }
  if (!teamMemberId && contact.phone) {
    const last10 = contact.phone.replace(/\D/g, '').slice(-10)
    const { data: matched } = await db
      .from('team_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('phone', `%${last10}%`)
      .limit(1)
    if (matched && matched.length > 0) teamMemberId = matched[0].id
  }
  if (!teamMemberId && contact.email) {
    const { data: matched } = await db
      .from('team_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', contact.email)
      .limit(1)
    if (matched && matched.length > 0) teamMemberId = matched[0].id
  }

  if ((clientId && clientId !== contact.client_id) || (teamMemberId && teamMemberId !== contact.team_member_id)) {
    await db
      .from('comhub_contacts')
      .update({
        client_id: clientId || contact.client_id,
        team_member_id: teamMemberId || contact.team_member_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  }

  let client: Record<string, unknown> | null = null
  let teamMember: Record<string, unknown> | null = null
  let recentBookings: Array<Record<string, unknown>> = []
  let totalSpent = 0
  let totalBookings = 0
  let outstandingCents = 0
  let cleanerRecentJobs: Array<Record<string, unknown>> = []
  let cleanerOwedCents = 0

  const BOOKING_FIELDS = 'id, start_time, end_time, service_type, status, payment_status, hourly_rate, actual_hours, price, partial_payment_cents, notes, check_in_time, check_out_time, team_member_id'

  if (clientId) {
    const { data: c } = await db
      .from('clients')
      .select('id, name, email, phone, address, status, active, do_not_service, dns_reason, sms_consent, notes, created_at')
      .eq('id', clientId)
      .single()
    client = c
    const { data: bks } = await db
      .from('bookings')
      // Aliased `cleaners:` — the panel reads booking.cleaners, not
      // booking.team_members (the raw FK relation name); without the alias
      // every cleaner name in this list silently rendered as "—".
      .select(`${BOOKING_FIELDS}, cleaners:team_members!bookings_team_member_id_fkey(name)`)
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('start_time', { ascending: false })
      .limit(5)
    recentBookings = (bks || []) as Array<Record<string, unknown>>
    const { count } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
    if (typeof count === 'number') totalBookings = count
    else totalBookings = recentBookings.length

    // Totals/outstanding computed over the FULL booking history, not just
    // the 5 shown — the old version summed only the 5 most recent rows,
    // which silently undercounted outstanding balance for any client with
    // more than 5 unpaid bookings.
    const { data: moneyRows } = await db
      .from('bookings')
      .select('price, partial_payment_cents, payment_status, status')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
    for (const b of moneyRows || []) {
      const priceCents = (b.price as number) || 0
      const partialCents = (b.partial_payment_cents as number) || 0
      if (b.payment_status === 'paid') totalSpent += priceCents
      if (b.payment_status !== 'paid' && b.status !== 'cancelled') {
        outstandingCents += Math.max(0, priceCents - partialCents)
      }
    }
  }

  if (teamMemberId) {
    const { data: tm } = await db
      .from('team_members')
      .select('id, name, email, phone, active, pay_rate, avg_rating, rating_count, has_car, created_at')
      .eq('id', teamMemberId)
      .single()
    teamMember = tm

    const { data: jobs } = await db
      .from('bookings')
      .select(`${BOOKING_FIELDS}, clients(name)`)
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .order('start_time', { ascending: false })
      .limit(5)
    cleanerRecentJobs = (jobs || []) as Array<Record<string, unknown>>

    const { data: unpaidRows } = await db
      .from('bookings')
      .select('team_member_pay')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .eq('status', 'completed')
      .eq('team_member_paid', false)
    cleanerOwedCents = (unpaidRows || []).reduce((s, b) => s + ((b.team_member_pay as number) || 0), 0)
  }

  return NextResponse.json({
    contact,
    client,
    cleaner: teamMember,
    recent_bookings: recentBookings,
    total_bookings: totalBookings,
    total_spent_cents: totalSpent,
    outstanding_cents: outstandingCents,
    cleaner_recent_jobs: cleanerRecentJobs,
    cleaner_owed_cents: cleanerOwedCents,
  })
}
