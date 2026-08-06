import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { sendClientSMS, sendClientEmail, type CommsTenant } from '@/lib/client-contacts'
import { clientSmsTemplates } from '@/lib/messaging/client-sms'
import { genericNotificationEmail } from '@/lib/email-templates'

const ALLOWED_MINUTES = new Set([30, 60, 90])

export async function POST(request: Request) {
  try {
    // Auth: fires a real client-facing SMS + email. A member can only notify
    // for their OWN booking, scoped to the token's tenant — same gate as the
    // sibling running-late route.
    const { auth, error } = await requirePortalPermission(request, 'jobs.view_own')
    if (error) return error

    const { bookingId, minutes } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    if (!ALLOWED_MINUTES.has(minutes)) {
      return NextResponse.json({ error: 'minutes must be 30, 60, or 90' }, { status: 400 })
    }

    const db = tenantDb(auth.tid)
    const { data: booking } = (await db
      .from('bookings')
      .select('id, tenant_id, client_id, start_time, team_size, recurring_type, team_members!bookings_team_member_id_fkey(name)')
      .eq('id', bookingId)
      .eq('team_member_id', auth.id)
      .single()) as {
        data: {
          tenant_id: string
          client_id: string | null
          start_time: string
          team_size: number | null
          recurring_type: string | null
          team_members: { name: string | null } | null
        } | null
      }

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!booking.client_id) return NextResponse.json({ error: 'No client on this booking' }, { status: 400 })

    const tenantId = booking.tenant_id
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, industry, phone, website_url, domain, domain_name, google_place_id, primary_color, logo_url, email_from, telnyx_api_key, telnyx_phone, resend_api_key')
      .eq('id', tenantId)
      .single<CommsTenant & {
        slug: string | null
        industry: string | null
        phone: string | null
        website_url: string | null
        domain: string | null
        domain_name: string | null
        google_place_id: string | null
        primary_color: string | null
        logo_url: string | null
      }>()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const smsTemplates = clientSmsTemplates(tenant)
    const smsBody = smsTemplates.onMyWay(
      { start_time: booking.start_time, team_size: booking.team_size, recurring_type: booking.recurring_type, team_members: booking.team_members },
      minutes
    )
    const cleanerName = booking.team_members?.name?.split(' ')[0] || 'Your pro'
    const emailHtml = genericNotificationEmail({
      tenantName: tenant.name || 'Your service',
      primaryColor: tenant.primary_color || undefined,
      logoUrl: tenant.logo_url || undefined,
      title: 'On My Way',
      message: `${cleanerName} is on the way and should arrive in about ${minutes} minutes.`,
    })

    const [smsResult, emailResult] = await Promise.all([
      sendClientSMS(tenant, booking.client_id, smsBody).catch(() => ({ sent: 0, skipped: 0 })),
      sendClientEmail(tenant, booking.client_id, `On my way — arriving in about ${minutes} min`, emailHtml).catch(() => ({ sent: 0, skipped: 0 })),
    ])

    return NextResponse.json({
      success: true,
      smsSent: smsResult.sent,
      emailSent: emailResult.sent,
    })
  } catch (err) {
    console.error('On-my-way error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
