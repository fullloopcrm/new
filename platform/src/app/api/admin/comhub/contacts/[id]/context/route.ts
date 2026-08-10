import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requireComhubAccess } from '@/lib/comhub-access'
import { decryptSecret } from '@/lib/secret-crypto'

// Some client/team-member pin values got written through encryptSecret() by
// a stray call elsewhere and now sit in the DB as a 'v1:' envelope instead
// of the plain 6-digit code — decryptSecret() passes plaintext through
// unchanged and correctly recovers the real value for the encrypted ones, so
// this is safe to run on every pin unconditionally.
const safeDecryptPin = (pin: string | null | undefined): string | null => {
  if (!pin) return null
  try {
    return decryptSecret(pin)
  } catch {
    return pin
  }
}

// GET /api/admin/comhub/contacts/[id]/context
// Enriched info for the right-side panel: contact + linked client + team_member +
// recent bookings + counters.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId
  const db = tenantDb(tenantId)
  const { id } = await ctx.params

  const { data: contact, error: cErr } = await db
    .from('comhub_contacts')
    .select('id, name, phone, email, address, client_id, team_member_id, tag, ip_address, geo_city, geo_region, blocked_at, blocked_reason')
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
  let applicant: Record<string, unknown> | null = null
  let recentBookings: Array<Record<string, unknown>> = []
  let totalSpent = 0
  let totalBookings = 0
  let outstandingCents = 0
  let cleanerBookings: Array<Record<string, unknown>> = []
  let cleanerTotalEarningsCents = 0

  if (clientId) {
    const { data: c } = await db
      .from('clients')
      .select('id, name, email, phone, address, address_line1, status, active, do_not_service, sms_consent, pin, pet_name, pet_type, notes_private, notes_public, created_at')
      .eq('id', clientId)
      .single()
    client = c ? { ...c, pin: safeDecryptPin(c.pin as string | null) } : c
    const { data: bks } = await db
      .from('bookings')
      .select('id, start_time, end_time, service_type, status, payment_status, hourly_rate, actual_hours, price, partial_payment_cents, team_member_id, team_members!bookings_team_member_id_fkey(name)')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('start_time', { ascending: false })
      .limit(10)
    recentBookings = (bks || []) as Array<Record<string, unknown>>
    const { count } = await db
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
    const { data: tm } = await db
      .from('team_members')
      .select('id, name, email, phone, address, pin, active, pay_rate, avg_rating, rating_count, has_car, created_at')
      .eq('id', teamMemberId)
      .single()
    teamMember = tm ? { ...tm, pin: safeDecryptPin(tm.pin as string | null) } : tm

    const { data: cbks } = await db
      .from('bookings')
      .select('id, start_time, service_type, status, payment_status, team_member_pay, price, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .order('start_time', { ascending: false })
      .limit(5)
    cleanerBookings = (cbks || []) as Array<Record<string, unknown>>

    const { data: earnedBookings } = await db
      .from('bookings')
      .select('team_member_pay')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .eq('status', 'completed')
      .not('team_member_pay', 'is', null)
    cleanerTotalEarningsCents = (earnedBookings || []).reduce(
      (sum, b) => sum + ((b as { team_member_pay: number | null }).team_member_pay || 0),
      0,
    )
  }

  // Not a client and not an active team member — check whether they're a
  // job applicant (applied via /apply, hasn't been hired/activated yet).
  // Without this, every applicant showed as a bare "Potential Lead" with no
  // name even though their application already has it on file.
  if (!clientId && !teamMemberId) {
    if (contact.phone) {
      const last10 = contact.phone.replace(/\D/g, '').slice(-10)
      const { data: app } = await db
        .from('team_applications')
        .select('id, name, email, phone, address, status, experience, created_at')
        .eq('tenant_id', tenantId)
        .ilike('phone', `%${last10}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      applicant = app
    }
    if (!applicant && contact.email) {
      const { data: app } = await db
        .from('team_applications')
        .select('id, name, email, phone, address, status, experience, created_at')
        .eq('tenant_id', tenantId)
        .ilike('email', contact.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      applicant = app
    }
    // Backfill the contact's name from the application so the thread-list
    // sidebar (which reads comhub_contacts.name directly) shows it too, not
    // just this detail panel.
    if (applicant?.name && !contact.name) {
      await db.from('comhub_contacts').update({ name: applicant.name, updated_at: new Date().toISOString() }).eq('id', id)
      contact.name = applicant.name
    }
  }

  // A "name" that's just the phone digits (e.g. '19292169760') is the
  // lead-intake placeholder, not a real name — happens when a phantom
  // `clients` row got auto-created for a phone that also belongs to a real
  // team_member (legacy data from before the webhook's dedupe guard). Prefer
  // an active team_member's real name over that placeholder every time; fall
  // back to the client's name only if it isn't the same placeholder pattern.
  const digitsOf = (v: string | null | undefined) => (v || '').replace(/\D/g, '')
  const isPlaceholderName = (name: string | null | undefined) => {
    const nameDigits = digitsOf(name)
    const phoneDigits = digitsOf(contact.phone as string | null)
    return !!nameDigits && !!phoneDigits && nameDigits.slice(-10) === phoneDigits.slice(-10)
  }
  const teamMemberName = teamMember?.name as string | undefined
  const clientName = client?.name as string | undefined
  const bestName = (teamMemberName && !isPlaceholderName(teamMemberName))
    ? teamMemberName
    : (clientName && !isPlaceholderName(clientName))
      ? clientName
      : (applicant?.name as string | undefined) || null
  if (bestName && (!contact.name || isPlaceholderName(contact.name as string))) {
    await db.from('comhub_contacts').update({ name: bestName, updated_at: new Date().toISOString() }).eq('id', id)
    contact.name = bestName
  }

  return NextResponse.json({
    contact,
    client,
    cleaner: teamMember,
    applicant,
    recent_bookings: recentBookings.slice(0, 5),
    total_bookings: totalBookings,
    total_spent_cents: totalSpent,
    outstanding_cents: outstandingCents,
    cleaner_bookings: cleanerBookings,
    cleaner_total_earnings_cents: cleanerTotalEarningsCents,
  })
}
