import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { isCrossSiteRequest } from '@/lib/csrf-guard'
import { escapeLikeValue } from '@/lib/postgrest-safe'

// GET /api/admin/comhub/contacts/[id]/context
// Enriched info for the right-side panel: contact + linked client + team_member +
// recent bookings + counters.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const { id } = await ctx.params

  const { data: contact, error: cErr } = await supabaseAdmin
    .from('comhub_contacts')
    .select('id, name, phone, email, client_id, team_member_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (cErr || !contact) return NextResponse.json({ error: 'contact not found' }, { status: 404 })

  let clientId = contact.client_id as string | null
  let teamMemberId = contact.team_member_id as string | null

  // Exact national-number match only (mirrors ingest/lead's fix for this
  // exact bug class) -- a substring ilike() with no length floor let a
  // short/malformed inbound contact phone match an ARBITRARY unrelated
  // client/team_member in this tenant, and the mismatch gets PERSISTED
  // below (comhub_contacts.client_id/team_member_id), misattributing every
  // future message on this contact to the wrong person's profile/history.
  const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
  const normalizedContactPhone = contact.phone ? nat(contact.phone.replace(/\D/g, '')) : ''

  if (!clientId && normalizedContactPhone.length >= 10) {
    const { data: candidates } = await supabaseAdmin
      .from('clients')
      .select('id, phone')
      .eq('tenant_id', tenantId)
    const match = candidates?.find((c) => nat((c.phone || '').replace(/\D/g, '')) === normalizedContactPhone)
    if (match) clientId = match.id
  }
  // Same misattribution class as the phone match above, via LIKE-wildcard
  // injection instead of a missing length floor -- contact.email traces back
  // to an inbound sender address (attacker-influenceable), so it must be
  // escaped before reaching ilike() or a crafted `%`/`_` can match an
  // unrelated client's email and get that wrong id PERSISTED below.
  if (!clientId && contact.email) {
    const { data: matched } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', escapeLikeValue(contact.email))
      .limit(1)
    if (matched && matched.length > 0) clientId = matched[0].id
  }
  if (!teamMemberId && normalizedContactPhone.length >= 10) {
    const { data: candidates } = await supabaseAdmin
      .from('team_members')
      .select('id, phone')
      .eq('tenant_id', tenantId)
    const match = candidates?.find((c) => nat((c.phone || '').replace(/\D/g, '')) === normalizedContactPhone)
    if (match) teamMemberId = match.id
  }
  if (!teamMemberId && contact.email) {
    const { data: matched } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', escapeLikeValue(contact.email))
      .limit(1)
    if (matched && matched.length > 0) teamMemberId = matched[0].id
  }

  // Skipped on a forged cross-site GET (SameSite=Lax still sends the
  // admin_token cookie on top-level navigation) -- see csrf-guard.ts. Same
  // convention already applied to notifications/tenant-chats/dashboard-messages.
  if (
    (clientId && clientId !== contact.client_id) ||
    (teamMemberId && teamMemberId !== contact.team_member_id)
  ) {
    if (!isCrossSiteRequest(req.headers)) {
      await supabaseAdmin
        .from('comhub_contacts')
        .update({
          client_id: clientId || contact.client_id,
          team_member_id: teamMemberId || contact.team_member_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    }
  }

  let client: Record<string, unknown> | null = null
  let teamMember: Record<string, unknown> | null = null
  let recentBookings: Array<Record<string, unknown>> = []
  let totalSpent = 0
  let totalBookings = 0
  let outstandingCents = 0

  if (clientId) {
    const { data: c } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, address, status, active, do_not_service, sms_consent, notes, created_at')
      .eq('id', clientId)
      .single()
    client = c
    const { data: bks } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, service_type, status, payment_status, hourly_rate, actual_hours, price, partial_payment_cents, team_member_id, team_members!bookings_team_member_id_fkey(name)')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('start_time', { ascending: false })
      .limit(10)
    recentBookings = (bks || []) as Array<Record<string, unknown>>
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
    if (typeof count === 'number') totalBookings = count
    else totalBookings = recentBookings.length

    for (const b of recentBookings) {
      const priceCents = (b.price as number) || 0
      const partialCents = (b.partial_payment_cents as number) || 0
      if (b.payment_status === 'paid') totalSpent += priceCents
      if (b.payment_status !== 'paid' && b.status !== 'cancelled') {
        outstandingCents += Math.max(0, priceCents - partialCents)
      }
    }
  }

  if (teamMemberId) {
    const { data: tm } = await supabaseAdmin
      .from('team_members')
      .select('id, name, email, phone, active, hourly_rate, avg_rating, rating_count, has_car, created_at')
      .eq('id', teamMemberId)
      .single()
    teamMember = tm
  }

  return NextResponse.json({
    contact,
    client,
    cleaner: teamMember,
    recent_bookings: recentBookings.slice(0, 5),
    total_bookings: totalBookings,
    total_spent_cents: totalSpent,
    outstanding_cents: outstandingCents,
  })
}
