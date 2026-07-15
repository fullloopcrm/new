import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { escapeHtml } from '@/lib/escape-html'

/**
 * POST /api/bookings/batch
 * Bulk-create bookings (e.g. recurring schedule expansion).
 * Notifications are sent ONLY for the first row.
 */
export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError
  const { tenantId } = tenant

  const body = await request.json()
  const bookingInputs = body.bookings as Array<Record<string, unknown>> | undefined
  const schedule_id = body.schedule_id as string | undefined

  if (!Array.isArray(bookingInputs) || bookingInputs.length === 0) {
    return NextResponse.json({ error: 'bookings array required' }, { status: 400 })
  }
  if (bookingInputs.length > 200) {
    return NextResponse.json({ error: 'Max 200 bookings per batch' }, { status: 400 })
  }

  // Confirm every caller-supplied client_id/team_member_id belongs to this
  // tenant before it can be joined into the response below or used to fire a
  // real SMS/email -- same FK-injection class already fixed on the sibling
  // single-booking POST /api/bookings (75a66b65): a foreign id would leak
  // that stranger's full clients(*)/team_members(*) row via this route's own
  // post-insert .select() join, plus trigger a real booking-confirmation /
  // job-assignment SMS to them over this tenant's own Telnyx number.
  const db = tenantDb(tenantId)
  const clientIds = [...new Set(bookingInputs.map(b => b.client_id).filter(Boolean))] as string[]
  const teamMemberIds = [...new Set(bookingInputs.map(b => b.team_member_id).filter(Boolean))] as string[]

  if (clientIds.length > 0) {
    const { data: ownedClients } = (await db.from('clients').select('id').in('id', clientIds)) as {
      data: { id: string }[] | null
    }
    const owned = new Set((ownedClients || []).map(c => c.id))
    if (clientIds.some(id => !owned.has(id))) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
  }
  if (teamMemberIds.length > 0) {
    const { data: ownedMembers } = (await db.from('team_members').select('id').in('id', teamMemberIds)) as {
      data: { id: string }[] | null
    }
    const owned = new Set((ownedMembers || []).map(m => m.id))
    if (teamMemberIds.some(id => !owned.has(id))) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }
  }

  const rows = bookingInputs.map(b => {
    const token = generateToken()
    const tokenExpires = new Date(b.start_time as string)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      client_id: b.client_id,
      team_member_id: b.team_member_id || b.team_member_id || null,
      start_time: b.start_time,
      end_time: b.end_time,
      service_type: b.service_type,
      service_type_id: b.service_type_id || null,
      price: b.price,
      hourly_rate: b.hourly_rate || null,
      notes: b.notes || null,
      recurring_type: b.recurring_type || null,
      team_member_token: token,
      token_expires_at: tokenExpires.toISOString(),
      status: (b.status as string) || 'scheduled',
      pay_rate: b.pay_rate || null,
      schedule_id: (b.schedule_id as string) || schedule_id || null,
    }
  })

  const { data, error } = await db
    .from('bookings')
    .insert(rows)
    .select('*, clients(*), team_members!bookings_team_member_id_fkey(*)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const first = (data || [])[0]
  if (first && first.status !== 'pending') {
    try {
      const client = first.clients as { name?: string; email?: string | null; phone?: string | null } | null
      const cleaner = first.team_members as { name?: string; email?: string | null; phone?: string | null } | null

      const bookingDate = new Date(first.start_time).toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

      // Resolve tenant SMS creds
      const { data: tRow } = await supabaseAdmin
        .from('tenants')
        .select('telnyx_api_key, telnyx_phone, resend_api_key, email_from')
        .eq('id', tenantId)
        .single()

      const telnyxApiKey = (tRow?.telnyx_api_key as string) || process.env.TELNYX_API_KEY || ''
      const telnyxPhone = (tRow?.telnyx_phone as string) || process.env.TELNYX_PHONE || ''
      const resendKey = (tRow?.resend_api_key as string) || process.env.RESEND_API_KEY || ''
      const fromEmail = (tRow?.email_from as string) || process.env.EMAIL_FROM || ''

      // Resolve tenant brand for SMS templates
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id')
        .eq('id', tenantId)
        .single()

      // Client SMS confirmation
      if (client?.phone && telnyxApiKey && telnyxPhone) {
        sendSMS({
          to: client.phone,
          body: (await clientSmsTemplatesFor(tenantId)).bookingConfirmation(first),
          telnyxApiKey,
          telnyxPhone,
        }).catch(err => console.error('[batch] client SMS error:', err))
      }

      // Cleaner SMS assignment
      if (cleaner?.phone && telnyxApiKey && telnyxPhone) {
        sendSMS({
          to: cleaner.phone,
          body: teamSmsTemplates(tenantRow || {}).jobAssignment(first),
          telnyxApiKey,
          telnyxPhone,
        }).catch(err => console.error('[batch] cleaner SMS error:', err))
      }

      // Client email confirmation
      if (client?.email && resendKey && fromEmail) {
        sendEmail({
          to: client.email,
          subject: `Booking confirmed for ${bookingDate}`,
          html: `<p>Hi ${escapeHtml(client.name) || 'there'},</p><p>Your booking on <strong>${bookingDate}</strong> is confirmed.</p>`,
          from: fromEmail,
          resendApiKey: resendKey,
        }).catch(err => console.error('[batch] client email error:', err))
      }
    } catch (notifyErr) {
      console.error('[batch] notification error:', notifyErr)
    }
  }

  return NextResponse.json({ created: (data || []).length, bookings: data })
}
