import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { audit } from '@/lib/audit'
import { tenantSiteUrl } from '@/lib/tenant-site'

// Booking-driven find-a-cleaner broadcast. The admin picks recipients
// explicitly from two rosters (GET) rather than the route auto-computing
// eligibility -- team members get the claim-the-job text (address, labor
// rate, portal link); applicants (not yet hired) get a simpler "contact us
// to activate your portal" text. Not routed through
// admin/message-applicants/send -- that route is hard-gated by TEST_MODE
// (constants.ts) for its own mass-campaign use case; this is a targeted,
// per-booking send and re-applies its own (untest-gated) eligibility here.
// Reads team_applications, not cleaner_applications -- the latter stopped
// receiving new rows 2026-07-16 (see message-applicants/preview/route.ts).
// team_applications status enum is ('pending','approved','rejected').
const EXCLUDED_APPLICANT_STATUSES = ['approved', 'rejected']

type MemberRow = { id: string; name: string; phone: string | null; active: boolean | null; status: string | null }
type ApplicantRow = { id: string; name: string | null; phone: string | null; status: string | null }

// Naive timestamps (no timezone suffix) are stored as ET wall-clock time
// directly -- same convention as CreateBookingForm/EditBookingForm's
// buildNaiveTime/parseNaive. No timezone math needed, just read HH:MM.
function formatNaiveClock(naive: string): string {
  const timePart = naive.split('T')[1] || '00:00:00'
  const [hStr, mStr] = timePart.split(':')
  let h = parseInt(hStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mStr} ${ampm}`
}

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant
  const db = tenantDb(tenantId)

  const [{ data: members }, { data: applicants }, { data: tenantData }] = await Promise.all([
    db.from('team_members').select('id, name, phone, active, status') as unknown as Promise<{ data: MemberRow[] | null }>,
    db.from('team_applications').select('id, name, phone, status') as unknown as Promise<{ data: ApplicantRow[] | null }>,
    supabaseAdmin.from('tenants').select('domain, slug').eq('id', tenantId).single(),
  ])

  const eligibleMembers = (members || []).filter(m => m.active !== false && (m.status || 'active') !== 'inactive' && !!m.phone)
  const eligibleApplicants = (applicants || []).filter(a => !!a.phone && !(a.status && EXCLUDED_APPLICANT_STATUSES.includes(a.status)))

  return NextResponse.json({
    members: eligibleMembers.map(m => ({ id: m.id, name: m.name, phone: m.phone })),
    applicants: eligibleApplicants.map(a => ({ id: a.id, name: a.name || 'Applicant', phone: a.phone })),
    portal_url: tenantData ? `${tenantSiteUrl(tenantData)}/team` : null,
  })
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.edit')
  if (authError) return authError
  const { tenantId } = tenant

  const { booking_id, rate_override, member_ids, applicant_ids, team_message, applicant_message } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  if ((!member_ids || member_ids.length === 0) && (!applicant_ids || applicant_ids.length === 0)) {
    return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
  }

  const db = tenantDb(tenantId)

  const { data: booking } = (await db
    .from('bookings')
    .select('id, team_member_id, status, pay_rate, start_time, end_time, clients(address)')
    .eq('id', booking_id)
    .single()) as {
      data: {
        id: string; team_member_id: string | null; status: string
        pay_rate: number | null
        start_time: string; end_time: string | null
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
  const timeRange = booking.end_time
    ? `${formatNaiveClock(booking.start_time)} to ${formatNaiveClock(booking.end_time)}`
    : formatNaiveClock(booking.start_time)

  let teamResult = { sent: 0, eligible: 0, members: [] as string[] }
  if (member_ids && member_ids.length > 0) {
    const { data: members } = (await db
      .from('team_members')
      .select('id, name, phone, active, status')
      .in('id', member_ids)) as { data: MemberRow[] | null }

    // Never trust the client's id list blindly -- re-check active/phone server-side.
    const eligible = (members || []).filter(m => m.active !== false && (m.status || 'active') !== 'inactive' && !!m.phone)

    if (eligible.length > 0) {
      // Admin can edit the message in the picker UI -- use it verbatim if
      // provided, since it may already have the real portal link/address/
      // rate substituted in. Falls back to the same default template if the
      // admin never touched it (or an older client didn't send one).
      const body = (typeof team_message === 'string' && team_message.trim()) ? team_message : [
        'There is a job available in your portal — first team member to claim it gets it.',
        `You must be able to arrive within 60-90 minutes.${payRate ? ` Pays $${payRate}/hr.` : ''} ${timeRange}.${address ? ` ${address}.` : ''}`,
        portalUrl,
        '',
        'Hay un trabajo disponible en tu portal — el primero en reclamarlo se lo queda.',
        `Debes poder llegar en 60-90 minutos.${payRate ? ` Paga $${payRate}/hr.` : ''} ${timeRange}.${address ? ` ${address}.` : ''}`,
        portalUrl,
      ].join('\n')

      const results = await Promise.allSettled(eligible.map(m => sendSMS({
        to: m.phone as string,
        body,
        telnyxApiKey: tenantData.telnyx_api_key as string,
        telnyxPhone: tenantData.telnyx_phone as string,
      })))
      teamResult = {
        sent: results.filter(r => r.status === 'fulfilled').length,
        eligible: eligible.length,
        members: eligible.map(m => m.name),
      }
    }
  }

  let applicantResult = { sent: 0, eligible: 0, applicants: [] as string[] }
  if (applicant_ids && applicant_ids.length > 0) {
    const { data: applicants } = (await db
      .from('team_applications')
      .select('id, name, phone, status')
      .in('id', applicant_ids)) as { data: ApplicantRow[] | null }

    const eligible = (applicants || []).filter(a => !!a.phone && !(a.status && EXCLUDED_APPLICANT_STATUSES.includes(a.status)))

    if (eligible.length > 0) {
      const body = (typeof applicant_message === 'string' && applicant_message.trim()) ? applicant_message : [
        "There's an available cleaning — contact us to activate your portal to claim it.",
        'You must have your own supplies and equipment. Reply STOP to stop receiving messages.',
        '',
        'Hay una limpieza disponible — contáctenos para activar su portal y reclamarla.',
        'Debe tener sus propios suministros y equipo. Responda STOP para dejar de recibir mensajes.',
      ].join('\n')

      const results = await Promise.allSettled(eligible.map(a => sendSMS({
        to: a.phone as string,
        body,
        telnyxApiKey: tenantData.telnyx_api_key as string,
        telnyxPhone: tenantData.telnyx_phone as string,
      })))
      applicantResult = {
        sent: results.filter(r => r.status === 'fulfilled').length,
        eligible: eligible.length,
        applicants: eligible.map(a => a.name || 'Applicant'),
      }
    }
  }

  if (teamResult.eligible === 0 && applicantResult.eligible === 0) {
    return NextResponse.json({ error: 'No eligible recipients — everyone selected either has no phone on file or was excluded.' }, { status: 409 })
  }

  await audit({
    tenantId,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: {
      event: 'find_team_member_broadcast',
      team_sent: teamResult.sent,
      team_eligible: teamResult.eligible,
      applicant_sent: applicantResult.sent,
      applicant_eligible: applicantResult.eligible,
    },
  })

  return NextResponse.json({ team: teamResult, applicants: applicantResult })
}
