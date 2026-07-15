import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

// National (US) 10-digit number with an optional leading country-code '1'
// stripped -- returns null for anything shorter (a short or partial phone
// must never auto-link to an existing client/team_member). Mirrors the
// exact-match convention established in client/collect + deals/manual.
function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return national.length === 10 ? national : null
}

// GET /api/admin/comhub/contacts/[id]/context
// Enriched info for the right-side panel: contact + linked client + team_member +
// recent bookings + counters.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  if (!clientId && contact.phone) {
    const normalizedPhone = normalizePhoneDigits(contact.phone)
    if (normalizedPhone) {
      const { data: candidates } = await supabaseAdmin
        .from('clients')
        .select('id, phone')
        .eq('tenant_id', tenantId)
      const match = candidates?.find((c) => normalizePhoneDigits(c.phone || '') === normalizedPhone)
      if (match) clientId = match.id
    }
  }
  if (!clientId && contact.email) {
    const { data: matched } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', contact.email)
      .limit(1)
    if (matched && matched.length > 0) clientId = matched[0].id
  }
  if (!teamMemberId && contact.phone) {
    const normalizedPhone = normalizePhoneDigits(contact.phone)
    if (normalizedPhone) {
      const { data: candidates } = await supabaseAdmin
        .from('team_members')
        .select('id, phone')
        .eq('tenant_id', tenantId)
      const match = candidates?.find((c) => normalizePhoneDigits(c.phone || '') === normalizedPhone)
      if (match) teamMemberId = match.id
    }
  }
  if (!teamMemberId && contact.email) {
    const { data: matched } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', contact.email)
      .limit(1)
    if (matched && matched.length > 0) teamMemberId = matched[0].id
  }

  if ((clientId && clientId !== contact.client_id) || (teamMemberId && teamMemberId !== contact.team_member_id)) {
    await supabaseAdmin
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
