import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { parseNaiveET } from '@/lib/recurring'
import { tenantSiteUrl } from '@/lib/tenant-site'

// Booking-driven sibling of the older zone/free-form find-cleaner broadcast
// (preview/send routes) -- that one asks the admin to retype date/time/
// address by hand and has cleaners reply YES over SMS. This one starts from
// an already-unassigned booking (so it's already visible in the team
// portal's claim tab -- no state change needed) and just notifies eligible
// cleaners to go claim it there.
const BUFFER_MS = 60 * 60 * 1000
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const { booking_id, rate_override } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const db = tenantDb(tenantId)

  const { data: booking } = (await db
    .from('bookings')
    .select('id, team_member_id, status, start_time, end_time, service_type, hourly_rate, pay_rate, clients(address)')
    .eq('id', booking_id)
    .single()) as {
      data: {
        id: string; team_member_id: string | null; status: string
        start_time: string; end_time: string | null; service_type: string | null; hourly_rate: number | null
        pay_rate: number | null
        clients: { address: string | null } | null
      } | null
    }

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.team_member_id) {
    return NextResponse.json({ error: 'This booking already has a team member assigned — unassign it first' }, { status: 409 })
  }
  if (!['scheduled', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({ error: `Booking status is "${booking.status}" — only scheduled/confirmed bookings can be broadcast` }, { status: 409 })
  }

  // Overrides what the CLEANER gets paid (booking.pay_rate), never what the
  // client is billed (booking.hourly_rate) -- team-portal/checkout/route.ts's
  // baseCleanerRate reads booking.pay_rate first, so this is the field that
  // actually reaches payment.
  if (rate_override != null && Number(rate_override) > 0) {
    await db.from('bookings').update({ pay_rate: Number(rate_override) }).eq('id', booking_id)
  }

  const targetStart = parseNaiveET(booking.start_time)
  const targetEnd = booking.end_time ? parseNaiveET(booking.end_time) : new Date(targetStart.getTime() + DEFAULT_DURATION_MS)

  const dayYMD = booking.start_time.slice(0, 10)
  const [y, m, d] = dayYMD.split('-').map(Number)
  const nextDayYMD = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)

  const [{ data: members }, { data: dayBookings }] = await Promise.all([
    db.from('team_members').select('id, name, phone, active, status') as unknown as Promise<{
      data: { id: string; name: string; phone: string | null; active: boolean | null; status: string | null }[] | null
    }>,
    db.from('bookings')
      .select('id, team_member_id, start_time, end_time, status')
      .gte('start_time', `${dayYMD}T00:00:00`)
      .lt('start_time', `${nextDayYMD}T00:00:00`)
      .neq('id', booking_id)
      .not('status', 'eq', 'cancelled') as unknown as Promise<{
        data: { id: string; team_member_id: string | null; start_time: string; end_time: string | null; status: string }[] | null
      }>,
  ])

  const conflictsByMember = new Map<string, { start: Date; end: Date }[]>()
  for (const b of dayBookings || []) {
    if (!b.team_member_id) continue
    const s = parseNaiveET(b.start_time)
    const e = b.end_time ? parseNaiveET(b.end_time) : new Date(s.getTime() + DEFAULT_DURATION_MS)
    const arr = conflictsByMember.get(b.team_member_id) || []
    arr.push({ start: s, end: e })
    conflictsByMember.set(b.team_member_id, arr)
  }

  // Symmetric 1hr buffer: eligible only if EVERY other job that day clears a
  // full hour on both sides of the target slot.
  const eligible = (members || []).filter(m => {
    // Two separate inactive signals exist on this table (active boolean,
    // status string) -- matches the same active !== false && status !==
    // 'inactive' check CreateBookingForm.tsx's cleaner picker already uses.
    // This route was only checking `active`, so a member with active:true
    // but status:'inactive' still got broadcast to.
    if (m.active === false || (m.status || 'active') === 'inactive' || !m.phone) return false
    const existing = conflictsByMember.get(m.id) || []
    return existing.every(x =>
      x.end.getTime() + BUFFER_MS <= targetStart.getTime() ||
      x.start.getTime() >= targetEnd.getTime() + BUFFER_MS
    )
  })

  if (eligible.length === 0) {
    return NextResponse.json({ error: 'No eligible team members right now — everyone active either has no phone on file or a conflicting job that day.' }, { status: 409 })
  }

  const { data: tenantData } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone, domain, slug')
    .eq('id', tenantId)
    .single()

  if (!tenantData?.telnyx_api_key || !tenantData?.telnyx_phone) {
    return NextResponse.json({ error: 'SMS is not configured for this tenant' }, { status: 500 })
  }

  const portalUrl = `${tenantSiteUrl(tenantData)}/team`
  const address = booking.clients?.address || null
  const payRate = rate_override != null && Number(rate_override) > 0 ? Number(rate_override) : booking.pay_rate

  const body = [
    'There is a job available in your portal — first team member to claim it gets it.',
    `You must be able to arrive within 60-90 minutes.${payRate ? ` Pays $${payRate}/hr.` : ''}${address ? ` ${address}.` : ''}`,
    portalUrl,
    '',
    'Hay un trabajo disponible en tu portal — el primero en reclamarlo se lo queda.',
    `Debes poder llegar en 60-90 minutos.${payRate ? ` Paga $${payRate}/hr.` : ''}${address ? ` ${address}.` : ''}`,
    portalUrl,
  ].join('\n')

  const results = await Promise.allSettled(eligible.map(m => sendSMS({
    to: m.phone as string,
    body,
    telnyxApiKey: tenantData.telnyx_api_key as string,
    telnyxPhone: tenantData.telnyx_phone as string,
  })))
  const sentCount = results.filter(r => r.status === 'fulfilled').length

  await audit({
    tenantId,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'find_team_member_broadcast', eligible_count: eligible.length, sent_count: sentCount, member_ids: eligible.map(m => m.id) },
  })

  return NextResponse.json({ sent: sentCount, eligible: eligible.length, members: eligible.map(m => m.name) })
}
