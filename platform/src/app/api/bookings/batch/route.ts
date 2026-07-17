import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { sendSMS } from '@/lib/sms'
import { smsJobAssignment } from '@/lib/sms-templates'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'

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

  // client_id/team_member_id are caller-supplied per row; verify every id
  // belongs to this tenant before insert — the response joins clients(*)/
  // team_members(*) (full rows, incl. pin/pay_rate), so a foreign id would
  // otherwise leak another tenant's client or staff PII in bulk.
  //
  // The only caller of this route (BookingsAdmin.tsx's "New Booking" modal,
  // non-emergency/non-recurring path) sends the assignee as `cleaner_id`, not
  // `team_member_id` -- a prior column-name cleanup (c6c40cd1) collapsed the
  // `b.team_member_id || b.cleaner_id` fallback into `b.team_member_id ||
  // b.team_member_id`, silently dropping every cleaner assignment made through
  // that modal. Both keys are checked here so the ownership guard below covers
  // whichever one the caller actually used.
  const candidateClientIds = Array.from(new Set(bookingInputs.map(b => b.client_id).filter((v): v is string => typeof v === 'string')))
  const candidateMemberIds = Array.from(new Set(bookingInputs.map(b => (b.team_member_id ?? b.cleaner_id)).filter((v): v is string => typeof v === 'string')))
  if (candidateClientIds.length > 0) {
    const { data: ownedClients } = await supabaseAdmin.from('clients').select('id').eq('tenant_id', tenantId).in('id', candidateClientIds)
    const ownedIds = new Set((ownedClients || []).map(r => r.id))
    if (candidateClientIds.some(cid => !ownedIds.has(cid))) {
      return NextResponse.json({ error: 'Invalid client_id in bookings array' }, { status: 404 })
    }
  }
  if (candidateMemberIds.length > 0) {
    const { data: ownedMembers } = await supabaseAdmin.from('team_members').select('id').eq('tenant_id', tenantId).in('id', candidateMemberIds)
    const ownedIds = new Set((ownedMembers || []).map(r => r.id))
    if (candidateMemberIds.some(mid => !ownedIds.has(mid))) {
      return NextResponse.json({ error: 'Invalid team_member_id in bookings array' }, { status: 404 })
    }
  }

  const rows = bookingInputs.map(b => {
    const token = generateToken()
    const tokenExpires = new Date(b.start_time as string)
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    return {
      tenant_id: tenantId,
      client_id: b.client_id,
      team_member_id: b.team_member_id || b.cleaner_id || null,
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

  const { data, error } = await supabaseAdmin
    .from('bookings')  // tenant-scope-ok: insert payload carries tenant_id (built above)
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

      // Resolve tenant business name for SMS templates
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single()
      const bizName = (tenantRow?.name as string) || 'Your service team'

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
          body: smsJobAssignment(bizName, first),
          telnyxApiKey,
          telnyxPhone,
        }).catch(err => console.error('[batch] cleaner SMS error:', err))
      }

      // Client email confirmation
      if (client?.email && resendKey && fromEmail) {
        sendEmail({
          to: client.email,
          subject: `Booking confirmed for ${bookingDate}`,
          html: `<p>Hi ${escapeHtml(client.name || 'there')},</p><p>Your booking on <strong>${escapeHtml(bookingDate)}</strong> is confirmed.</p>`,
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
