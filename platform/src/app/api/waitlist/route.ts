/**
 * Waitlist — tenant-scoped. Ported from NYC Maid (src/app/api/waitlist/route.ts).
 *
 * GET  (admin): unions BOTH sources into one list:
 *   1. the dedicated `waitlist` table (public form / future admin+agent adds)
 *   2. legacy sms_conversations rows with outcome='waitlisted' (agent SMS flow)
 * POST (public): lead capture from /book/new when nothing fits a day. No admin
 *   auth — tenant is resolved from the signed middleware header. Rate-limited.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { tenantClient } from '@/lib/tenant-supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { smsAdmins } from '@/lib/admin-contacts'
import { escapeHtml } from '@/lib/escape-html'
import { createPrimaryContact } from '@/lib/client-contacts'
import { broadcastWaitlistBooking } from '@/lib/waitlist-broadcast'

interface WaitlistEntry {
  id: string
  name: string | null
  phone: string | null
  service_type: string | null
  preferred_date: string | null
  preferred_time: string | null
  created_at: string
  client_id: string | null
  source: string
}

interface WaitlistTableRow {
  id: string
  name: string | null
  phone: string | null
  service_type: string | null
  preferred_date: string | null
  preferred_time: string | null
  created_at: string
  client_id: string | null
  source: string | null
}

interface SmsConvoRow {
  id: string
  name: string | null
  phone: string | null
  service_type: string | null
  booking_checklist: Record<string, unknown> | null
  created_at: string
  client_id: string | null
}

export async function GET() {
  let tenantId: string
  try {
    ({ tenantId } = await getTenantForRequest())
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const entries: WaitlistEntry[] = []

  // Dedicated table. Missing table (not migrated yet) must not break the panel.
  const { data: rows, error: tableErr } = await tenantDb(tenantId)
    .from('waitlist')
    .select('id, name, phone, service_type, preferred_date, preferred_time, created_at, client_id, source, status')
    .neq('status', 'expired')
    .order('created_at', { ascending: false })
    .limit(50)
  if (!tableErr) {
    for (const r of (rows || []) as unknown as WaitlistTableRow[]) {
      entries.push({
        id: r.id,
        name: r.name,
        phone: r.phone,
        service_type: r.service_type,
        preferred_date: r.preferred_date,
        preferred_time: r.preferred_time,
        created_at: r.created_at,
        client_id: r.client_id,
        source: r.source || 'web',
      })
    }
  }

  // Legacy SMS-conversation waitlist.
  const { data: convos } = await (await tenantClient(tenantId))
    .from('sms_conversations')
    .select('id, name, phone, service_type, booking_checklist, created_at, client_id')
    .eq('tenant_id', tenantId)
    .eq('outcome', 'waitlisted')
    .eq('expired', false)
    .order('created_at', { ascending: false })
    .limit(50)
  for (const row of (convos || []) as unknown as SmsConvoRow[]) {
    const checklist = (row.booking_checklist as Record<string, unknown> | null) || {}
    entries.push({
      id: row.id,
      name: row.name || (checklist.name as string | undefined) || null,
      phone: row.phone,
      service_type: row.service_type || (checklist.service_type as string | undefined) || null,
      preferred_date: (checklist.waitlist_preferred_date as string | undefined) || (checklist.date as string | undefined) || null,
      preferred_time: (checklist.waitlist_preferred_time as string | undefined) || (checklist.time as string | undefined) || null,
      created_at: row.created_at,
      client_id: row.client_id,
      source: 'sms',
    })
  }

  entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json(entries)
}

// Public lead capture. Rate-limited per IP so it can't be spammed.
const rl = new Map<string, { count: number; resetAt: number }>()
const RL_WINDOW_MS = 10 * 60 * 1000
const RL_MAX = 5
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const e = rl.get(ip)
  if (!e || now > e.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS })
    return false
  }
  e.count++
  return e.count > RL_MAX
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ ok: false, error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(`${tenant.id}:${ip}`)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (!name || !phone) {
    return NextResponse.json({ ok: false, error: 'name and phone are required' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null)

  const preferredDate = str(body.preferred_date)
  const preferredTime = str(body.preferred_time)
  const estimatedHours = num(body.estimated_hours) || 2
  const hourlyRate = num(body.hourly_rate)
  const serviceType = str(body.service_type)
  const address = str(body.address)

  const { data: waitlistRow, error } = await tenantDb(tenant.id).from('waitlist').insert({
    name,
    phone,
    email: str(body.email),
    service_type: serviceType,
    address,
    preferred_date: preferredDate,
    preferred_time: preferredTime,
    estimated_hours: estimatedHours,
    hourly_rate: hourlyRate,
    notes: str(body.notes),
    source: 'web',
  }).select('id').single()

  const contactPhone = (tenant.phone as string | null) || ''
  // Graceful degrade: if the table isn't migrated yet, don't 500 the client —
  // still alert admin so the lead isn't lost, and tell the client to call.
  if (error) {
    await smsAdmins(tenant.id, `WAITLIST (table missing) — ${name} ${phone} wanted ${preferredDate || 'a day'} ${preferredTime || ''}. Run the waitlist migration. Lead not stored.`).catch(() => {})
    return NextResponse.json({ ok: false, fallback: true, error: contactPhone ? `Could not save — please call ${contactPhone}.` : 'Could not save — please call us.' }, { status: 200 })
  }

  const when = `${preferredDate || 'soon'}${preferredTime ? ' ' + preferredTime : ''}`
  await notify({
    tenantId: tenant.id,
    type: 'waitlist',
    title: 'New Waitlist',
    message: `${escapeHtml(name)} (${escapeHtml(phone)}) waitlisted for ${escapeHtml(when)}${serviceType ? ` · ${escapeHtml(serviceType)}` : ''}`,
  }).catch(() => {})
  await smsAdmins(tenant.id, `WAITLIST — ${name} ${phone} for ${when}. They couldn't find an open slot at /book/new. Reach out to book them.`).catch(() => {})

  // Create a real pending booking so the request sits in Bookings' "Pending
  // Approval" list (source='waitlist' — BookingsAdmin badges it distinctly)
  // instead of only living in the separate waitlist table, then auto-text
  // eligible cleaners about it. Needs a date at minimum; a lead with no date
  // preference at all can't be scheduled, so it stays waitlist-table-only.
  // No preferred_time given: defaults to 9:00 AM as a placeholder slot — the
  // claiming cleaner or admin still confirms/adjusts the real time.
  if (preferredDate) {
    const startClock = /^\d{1,2}:\d{2}/.test(preferredTime || '') ? preferredTime! : '09:00'
    const [sh, sm] = startClock.split(':').map(Number)
    const startNaive = `${preferredDate}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`
    const endMinutes = sh * 60 + sm + Math.round(estimatedHours * 60)
    const endNaive = `${preferredDate}T${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`

    let clientId: string | null = null
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) {
      const { data: existingClient } = await tenantDb(tenant.id)
        .from('clients')
        .select('id')
        .ilike('phone', `%${cleanPhone.slice(-10)}%`)
        .limit(1)
        .maybeSingle()
      if (existingClient) {
        clientId = existingClient.id as string
      } else {
        const { data: newClient } = await tenantDb(tenant.id)
          .from('clients')
          .insert({ name, phone, email: str(body.email), address })
          .select('id')
          .single()
        if (newClient) {
          clientId = newClient.id as string
          await createPrimaryContact(tenant.id, clientId, { name, phone, email: str(body.email) }).catch(() => {})
        }
      }
    }

    const { data: booking } = await tenantDb(tenant.id)
      .from('bookings')
      .insert({
        client_id: clientId,
        service_type: serviceType,
        start_time: startNaive,
        end_time: endNaive,
        status: 'pending',
        source: 'waitlist',
        hourly_rate: hourlyRate,
        price: hourlyRate ? Math.round(hourlyRate * estimatedHours * 100) : 0,
        notes: str(body.notes),
      })
      .select('id')
      .single()

    if (booking && waitlistRow) {
      await tenantDb(tenant.id).from('waitlist').update({ booking_id: booking.id }).eq('id', waitlistRow.id)

      await broadcastWaitlistBooking({
        tenantId: tenant.id,
        jobDate: preferredDate,
        startTime: startClock,
        durationHours: estimatedHours,
        jobAddress: address,
        hourlyRate,
        serviceType,
      }).catch((err) => console.error('[waitlist] broadcast failed:', err))
    }
  }

  return NextResponse.json({ ok: true })
}
