import { NextResponse } from 'next/server'
import { scoreTeamForBooking, suggestBookingSlots } from '@/lib/smart-schedule'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

// Public-safe wrapper around scoreCleanersForBooking. Strips fields that
// could leak other clients' info before returning. NO admin auth — public
// + portal-authenticated callers both use this.
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`smart-schedule:${ip}`, 30, 5 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const hostTenant = await getTenantFromHeaders()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time')
  const duration = searchParams.get('duration')
  let clientAddress = searchParams.get('address')
  const clientId = searchParams.get('client_id')
  const hourlyRate = searchParams.get('hourly_rate')
  let tenantId: string | null = null
  let preferredCleanerId: string | null = null

  if (clientId) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('address, tenant_id, preferred_team_member_id')
      .eq('id', clientId)
      .maybeSingle()
    // A client_id from a different tenant than the requesting site must be
    // ignored — otherwise this public, no-admin-auth endpoint lets any caller
    // pass an arbitrary client_id to pull another tenant's active team-member
    // roster/availability by resolving tenantId off attacker-supplied input
    // with no ownership check (this route never validated against the
    // Host-resolved tenant at all, unlike every sibling client-facing route).
    // Every legitimate caller arrives via a tenant subdomain/custom domain,
    // where middleware always injects the signed tenant headers, so a missing
    // hostTenant means this isn't a real tenant-site request either.
    if (client && hostTenant && client.tenant_id === hostTenant.id) {
      tenantId = client.tenant_id
      preferredCleanerId = client.preferred_team_member_id || null
      if (!clientAddress) clientAddress = client.address || null
    }
  }

  // Fall back to an unscored list of active team members when slot info isn't
  // complete. Lets the booking form show the picker upfront.
  if (!date || !startTime || !clientAddress || !tenantId) {
    if (!tenantId) {
      return NextResponse.json({ cleaners: [] })
    }
    // team_members.active is a stale, never-written import snapshot column
    // (see e33f55ef / migration 2026_07_17_team_members_active_column_backfill_PROPOSED.sql)
    // -- status is the field HR termination actually maintains. lib/smart-schedule.ts's
    // real scoring path already filters on status; this unscored fallback picker
    // didn't, so a terminated team member with a stale active=true could still be
    // shown to the public as bookable, while a currently active member with a
    // stale active=false silently vanished from their own booking form.
    const { data: all } = await tenantDb(tenantId)
      .from('team_members')
      .select('id, name')
      .neq('status', 'inactive')
      .order('name')
    const cleaners = (all || []).map(c => ({
      id: c.id,
      name: c.name,
      is_preferred: c.id === preferredCleanerId,
      zone_match: false,
      reason: c.id === preferredCleanerId ? 'Your preferred cleaner' : 'Pick date + time to check availability',
    }))
    return NextResponse.json({ cleaners })
  }

  const scores = await scoreTeamForBooking({
    tenantId,
    date,
    startTime,
    durationHours: duration ? parseFloat(duration) : 2,
    clientAddress,
    clientId: clientId || undefined,
    hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
  })

  const sanitized = scores
    .filter(s => s.available)
    .map(s => ({
      id: s.id,
      name: s.name,
      is_preferred: s.is_preferred,
      zone_match: s.zone_match,
      reason: s.is_preferred ? 'Your preferred cleaner' : s.zone_match ? 'Works in your area' : 'Available',
    }))

  // Alternate-time suggestions for the public booking form: when the picked time
  // has no available cleaner, offer other times that work. Computed only on
  // request (suggest=1) since it scans the whole day.
  // PRIVACY: the raw reason can name ANOTHER client ("8 min from their 12 PM
  // Sarah J job"). We expose only time + cleaner FIRST name + a generic reason.
  let suggestions = null
  if (searchParams.get('suggest') === '1' && sanitized.length === 0) {
    const raw = await suggestBookingSlots({
      tenantId,
      date,
      durationHours: duration ? parseFloat(duration) : 2,
      clientAddress,
      clientId: clientId || undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      requestedTime: startTime,
      stepMin: 60, // public picker only offers on-the-hour slots
    })
    suggestions = raw.map(s => ({
      time24: s.time24,
      label: s.label,
      cleaner: s.cleanerName.split(' ')[0],
      reason: s.travelFromPrevMin != null ? 'A cleaner is already in your area then' : 'Open with a great cleaner',
    }))
  }

  return NextResponse.json({ cleaners: sanitized, suggestions })
}
