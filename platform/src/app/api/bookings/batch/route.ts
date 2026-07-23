import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'
import { generateToken } from '@/lib/tokens'
import { sendSMS } from '@/lib/sms'
import { isCommEnabled } from '@/lib/comms-prefs'
import { clientSmsTemplatesFor } from '@/lib/messaging/client-sms'
import { teamSmsTemplates } from '@/lib/messaging/team-sms-resolver'
import { notify } from '@/lib/notify'
import { isNycMaid } from '@/lib/nycmaid/tenant'

/**
 * POST /api/bookings/batch
 * Bulk-create bookings (e.g. recurring schedule expansion).
 * Notifications are sent ONLY for the first row.
 */
export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError
  const { tenantId } = tenant
  const db = tenantDb(tenantId)

  const body = await request.json()
  const bookingInputs = body.bookings as Array<Record<string, unknown>> | undefined
  const schedule_id = body.schedule_id as string | undefined

  if (!Array.isArray(bookingInputs) || bookingInputs.length === 0) {
    return NextResponse.json({ error: 'bookings array required' }, { status: 400 })
  }
  if (bookingInputs.length > 200) {
    return NextResponse.json({ error: 'Max 200 bookings per batch' }, { status: 400 })
  }

  // client_id/team_member_id are caller-supplied FKs — tenantDb only stamps
  // tenant_id on the row being inserted, it doesn't validate a referenced id
  // belongs to this tenant, and neither clients nor team_members has a
  // cross-tenant FK check. Without this, a batch create could attach another
  // tenant's client or employee to these bookings (same class as
  // POST /api/bookings, fixed earlier this pass).
  const requestedClientIds = Array.from(
    new Set(bookingInputs.map((b) => b.client_id).filter((x): x is string => typeof x === 'string' && x.length > 0)),
  )
  const requestedMemberIds = Array.from(
    new Set(bookingInputs.map((b) => b.team_member_id).filter((x): x is string => typeof x === 'string' && x.length > 0)),
  )
  if (requestedClientIds.length > 0) {
    const { data: validClients } = await supabaseAdmin
      .from('clients')
      .select('id')
      .in('id', requestedClientIds)
      .eq('tenant_id', tenantId)
    const validIds = new Set((validClients || []).map((c) => c.id))
    if (requestedClientIds.some((cid) => !validIds.has(cid))) {
      return NextResponse.json({ error: 'Invalid client selection' }, { status: 400 })
    }
  }
  if (requestedMemberIds.length > 0) {
    const { data: validMembers } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .in('id', requestedMemberIds)
      .eq('tenant_id', tenantId)
    const validIds = new Set((validMembers || []).map((m) => m.id))
    if (requestedMemberIds.some((mid) => !validIds.has(mid))) {
      return NextResponse.json({ error: 'Invalid team member selection' }, { status: 400 })
    }
  }

  // service_type_id is the same shape of FK as client_id/team_member_id above
  // but was missing its ownership check entirely. POST /api/invoices?
  // from_booking_id later embeds service_types(name, default_hourly_rate,
  // pricing_model) off a booking's service_type_id with no tenant filter on
  // the embedded side, so a foreign id planted here becomes a cross-tenant
  // read one hop later (same exfil shape as the client_id/team_member_id
  // guards above, just via a sibling table).
  const requestedServiceTypeIds = Array.from(
    new Set(bookingInputs.map((b) => b.service_type_id).filter((x): x is string => typeof x === 'string' && x.length > 0)),
  )
  if (requestedServiceTypeIds.length > 0) {
    const { data: validServiceTypes } = await supabaseAdmin
      .from('service_types')
      .select('id')
      .in('id', requestedServiceTypeIds)
      .eq('tenant_id', tenantId)
    const validIds = new Set((validServiceTypes || []).map((s) => s.id))
    if (requestedServiceTypeIds.some((sid) => !validIds.has(sid))) {
      return NextResponse.json({ error: 'Invalid service type selection' }, { status: 400 })
    }
  }

  // schedule_id (top-level default + per-row override) is the same shape of FK
  // as client_id/team_member_id/service_type_id above but was missing its
  // ownership check entirely — recurring_schedules has its own tenant_id and no
  // cross-tenant FK check. A poisoned schedule_id doesn't surface via any read
  // embed today, but cron/generate-recurring's "latest booking for this
  // schedule" lookup (src/app/api/cron/generate-recurring/route.ts) is NOT
  // tenant-filtered, so a foreign booking sharing a victim tenant's real
  // schedule_id with a far-future start_time permanently starves that
  // schedule's auto-generation (cross-tenant DoS via FK injection) — same bug
  // class as the other three FKs here, just a write-then-DoS shape instead of
  // read-exfil.
  const requestedScheduleIds = Array.from(
    new Set(
      bookingInputs
        .map((b) => (b.schedule_id as string | undefined) || schedule_id)
        .filter((x): x is string => typeof x === 'string' && x.length > 0),
    ),
  )
  if (requestedScheduleIds.length > 0) {
    const { data: validSchedules } = await supabaseAdmin
      .from('recurring_schedules')
      .select('id')
      .in('id', requestedScheduleIds)
      .eq('tenant_id', tenantId)
    const validIds = new Set((validSchedules || []).map((s) => s.id))
    if (requestedScheduleIds.some((sid) => !validIds.has(sid))) {
      return NextResponse.json({ error: 'Invalid schedule selection' }, { status: 400 })
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
      discount_percent: b.discount_percent || null,
      one_time_credit_cents: b.one_time_credit_cents || null,
      one_time_credit_reason: b.one_time_credit_reason || null,
      schedule_id: (b.schedule_id as string) || schedule_id || null,
    }
  })

  const { data, error } = await db
    .from('bookings')  // tenantDb stamps tenant_id (rows already carry it — idempotent)
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
        .select('telnyx_api_key, telnyx_phone')
        .eq('id', tenantId)
        .single()

      const telnyxApiKey = (tRow?.telnyx_api_key as string) || process.env.TELNYX_API_KEY || ''
      const telnyxPhone = (tRow?.telnyx_phone as string) || process.env.TELNYX_PHONE || ''

      // Resolve tenant brand for SMS templates
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('name, slug, industry, phone, website_url, domain, domain_name, google_place_id')
        .eq('id', tenantId)
        .single()

      // Client SMS confirmation
      if (client?.phone && telnyxApiKey && telnyxPhone && (await isCommEnabled(tenantId, 'booking_confirmed', 'sms'))) {
        sendSMS({
          to: client.phone,
          body: (await clientSmsTemplatesFor(tenantId)).bookingConfirmation(first),
          telnyxApiKey,
          telnyxPhone,
        }).catch(err => console.error('[batch] client SMS error:', err))
      }

      // Cleaner SMS assignment
      if (cleaner?.phone && telnyxApiKey && telnyxPhone && (await isCommEnabled(tenantId, 'team_assignment', 'sms'))) {
        sendSMS({
          to: cleaner.phone,
          body: teamSmsTemplates(tenantRow || {}).jobAssignment(first),
          telnyxApiKey,
          telnyxPhone,
        }).catch(err => console.error('[batch] cleaner SMS error:', err))
      }

      // Client email confirmation — same standard template for every tenant
      // (matches the fix in bookings/route.ts and the cancellation email in
      // bookings/[id]/route.ts; nycmaid used to get its own hardcoded legacy
      // template here), via the shared notify() dispatcher (handles
      // comm-prefs gating + SMS fallback itself).
      if (client?.email) {
        await notify({
          tenantId,
          type: 'booking_confirmed',
          title: `Booking Confirmed — ${bookingDate}`,
          message: `Your appointment on ${bookingDate} is confirmed.`,
          channel: 'email',
          recipientType: 'client',
          recipientId: first.client_id as string,
          bookingId: first.id as string,
          metadata: {
            clientName: client.name,
            serviceName: first.service_type,
            teamMemberName: cleaner?.name || 'Your pro',
          },
        }).catch(err => console.error('[batch] client email error:', err))
      }
    } catch (notifyErr) {
      console.error('[batch] notification error:', notifyErr)
    }
  }

  return NextResponse.json({ created: (data || []).length, bookings: data })
}
