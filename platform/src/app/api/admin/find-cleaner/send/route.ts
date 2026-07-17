import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { sendSMS } from '@/lib/sms'
import { guessZoneFromAddress, SERVICE_ZONES } from '@/lib/service-zones'
import { TEST_MODE, TEST_CLEANER_NAME_SUBSTRING, BROADCAST_CAP, BUFFER_HOURS } from '../preview/route'

function zoneLabel(zoneId: string | null, lang: 'en' | 'es'): string {
  if (!zoneId) return ''
  const z = SERVICE_ZONES.find((s) => s.id === zoneId)
  if (!z) return zoneId
  return lang === 'es' ? z.labelES : z.label
}

function fmtTimeRange(date: string, start: string, hours: number, lang: 'en' | 'es'): { date: string; time: string } {
  const [sh, sm] = start.split(':').map(Number)
  const startD = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`)
  const endD = new Date(startD.getTime() + hours * 3600 * 1000)
  const locale = lang === 'es' ? 'es-US' : 'en-US'
  const dateStr = startD.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' })
  const startStr = startD.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
  const endStr = endD.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
  return { date: dateStr, time: `${startStr}-${endStr}` }
}

function buildMessage(opts: {
  brand: string
  replyNumber: string
  cleanerName: string
  job_date: string
  start_time: string
  duration_hours: number
  zone: string | null
  hourly_rate: number | null
  lang: 'en' | 'es'
  testMode: boolean
}): string {
  const { brand, replyNumber, cleanerName, job_date, start_time, duration_hours, zone, hourly_rate, lang, testMode } = opts
  const firstName = cleanerName.split(' ')[0]
  const t = fmtTimeRange(job_date, start_time, duration_hours, lang)
  const zoneTxt = zone ? zoneLabel(zone, lang) : ''
  const rateTxt = hourly_rate ? `$${hourly_rate}/hr` : ''
  const testPrefix = testMode ? '[TEST] ' : ''

  if (lang === 'es') {
    return [
      `${testPrefix}Hola ${firstName}, ${brand}.`,
      `¿Disponible ${t.date} ${t.time}${zoneTxt ? ` en ${zoneTxt}` : ''}?`,
      rateTxt ? `Pago: ${rateTxt}.` : '',
      `Responde SI al ${replyNumber} si estás disponible.`,
    ].filter(Boolean).join(' ')
  }
  return [
    `${testPrefix}Hi ${firstName}, ${brand}.`,
    `Available ${t.date} ${t.time}${zoneTxt ? ` in ${zoneTxt}` : ''}?`,
    rateTxt ? `Pay: ${rateTxt}.` : '',
    `Reply YES to ${replyNumber} if available.`,
  ].filter(Boolean).join(' ')
}

type CleanerRow = {
  id: string
  name: string
  phone: string | null
  preferred_language: string | null
  hourly_rate: number | null
  sms_consent: boolean | null
}

export async function POST(request: Request) {
  // Mass-SMS broadcast to team members — same blast-radius/cost/brand-risk
  // class as the sibling send-apology-batch route, which is gated on
  // campaigns.send. This route previously only checked for a valid tenant
  // session via getTenantForRequest(), so any authenticated role (incl.
  // 'staff', which has neither campaigns.send nor team.edit per rbac.ts)
  // could broadcast SMS to every team member.
  const { tenant: ctx, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError
  const tenantId = ctx.tenantId

  const body = await request.json().catch(() => ({}))
  const {
    job_date, start_time, duration_hours, qty_needed, job_address,
    hourly_rate_override, service_type, notes, cleaner_ids, confirmed,
  } = body as {
    job_date?: string; start_time?: string; duration_hours?: number; qty_needed?: number
    job_address?: string; hourly_rate_override?: number | null; service_type?: string
    notes?: string; cleaner_ids?: string[]; confirmed?: boolean
  }

  if (!job_date || !start_time || !duration_hours || !cleaner_ids || cleaner_ids.length === 0) {
    return NextResponse.json({ error: 'job_date, start_time, duration_hours, cleaner_ids required' }, { status: 400 })
  }
  if (!confirmed) return NextResponse.json({ error: 'Must confirm before sending' }, { status: 400 })
  if (cleaner_ids.length > BROADCAST_CAP) {
    return NextResponse.json({ error: `Cap is ${BROADCAST_CAP} recipients per broadcast` }, { status: 400 })
  }

  // Tenant brand + telnyx config (per-tenant SMS — never a shared/global number)
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) {
    return NextResponse.json({ error: 'Tenant has no Telnyx SMS number configured' }, { status: 400 })
  }
  const brand = tenant.name || 'Our team'
  const replyNumber = tenant.telnyx_phone

  const { data: cleaners, error: cErr } = await supabaseAdmin
    .from('team_members')
    .select('id, name, phone, preferred_language, hourly_rate, sms_consent')
    .eq('tenant_id', tenantId)
    .in('id', cleaner_ids)
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  // Mass-SMS guard: TEST_MODE hard-filters to the test cleaner row(s) until cleared.
  // sms_consent !== false: same team-member opt-out gate as bookings/broadcast
  // (item 48) — this route is that route's sibling mass-dispatch broadcast and
  // was texting opted-out team members unconditionally before this check existed.
  const recipients = (cleaners as CleanerRow[] || []).filter((c) => {
    if (!c.phone) return false
    if (c.sms_consent === false) return false
    if (TEST_MODE && !c.name.toLowerCase().includes(TEST_CLEANER_NAME_SUBSTRING)) return false
    return true
  })
  if (recipients.length === 0) {
    return NextResponse.json({
      error: TEST_MODE
        ? `TEST MODE — no team member named "${TEST_CLEANER_NAME_SUBSTRING}" with a phone on file`
        : 'No recipients with phones on file (or all opted out of SMS)',
    }, { status: 400 })
  }

  const zone = job_address ? guessZoneFromAddress(job_address) : null
  const effectiveRate = hourly_rate_override ?? null

  const [sh, sm] = start_time.split(':').map(Number)
  const endMinutes = sh * 60 + sm + Math.round(duration_hours * 60)
  const end_time = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

  const sampleMsg = buildMessage({
    brand, replyNumber, cleanerName: recipients[0].name,
    job_date, start_time, duration_hours, zone,
    hourly_rate: effectiveRate ?? recipients[0].hourly_rate,
    lang: (recipients[0].preferred_language as 'en' | 'es') || 'en',
    testMode: TEST_MODE,
  })

  const { data: broadcast, error: bErr } = await supabaseAdmin
    .from('cleaner_broadcasts')
    .insert({
      tenant_id: tenantId,
      job_date, start_time, end_time,
      qty_needed: qty_needed || 1,
      job_address: job_address || null,
      job_zone: zone,
      hourly_rate: effectiveRate,
      service_type: service_type || null,
      message: sampleMsg,
      notes: notes || null,
      status: 'open',
      test_mode: TEST_MODE,
    })
    .select()
    .single()
  if (bErr || !broadcast) return NextResponse.json({ error: bErr?.message || 'Insert failed' }, { status: 500 })

  const results = await Promise.all(
    recipients.map(async (c) => {
      const lang = (c.preferred_language as 'en' | 'es') || 'en'
      const message = buildMessage({
        brand, replyNumber, cleanerName: c.name,
        job_date, start_time, duration_hours, zone,
        hourly_rate: effectiveRate ?? c.hourly_rate,
        lang, testMode: TEST_MODE,
      })
      const smsResult = await sendSMS({
        to: c.phone!, body: message,
        telnyxApiKey: tenant.telnyx_api_key, telnyxPhone: tenant.telnyx_phone,
      })
      const ok = !!smsResult?.success
      await supabaseAdmin.from('cleaner_broadcast_recipients').insert({
        tenant_id: tenantId,
        broadcast_id: broadcast.id,
        cleaner_id: c.id,
        phone: c.phone,
        status: ok ? 'pending' : 'failed',
        delivery_status: ok ? 'sent' : (smsResult?.error || 'failed'),
      })
      return { cleaner_id: c.id, name: c.name, sent: ok }
    })
  )

  return NextResponse.json({
    test_mode: TEST_MODE,
    broadcast_id: broadcast.id,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => !r.sent).length,
    buffer_hours: BUFFER_HOURS,
    results,
  })
}
