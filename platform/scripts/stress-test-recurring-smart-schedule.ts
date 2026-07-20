/**
 * Live stress test (spec §11) for the recurring-discount + smart-scheduling
 * port (booking-smart-scheduling-port branch). Exercises the real route
 * handlers over real HTTP against a local dev server (not direct DB writes)
 * — the auth/route-handler layer is part of what can break.
 *
 * Creates one throwaway tenant + client + team members, drives:
 *   1. POST /api/admin/recurring-schedules  (no cleaner, no discount override)
 *   2. POST /api/client/recurring           (no cleaner, monthly cadence)
 *   3. POST /api/admin/recurring-schedules  (cleaner picked, then deactivated)
 *   4. GET  /api/cron/generate-recurring    (real cron pass)
 * then asserts discount_percent + suggested_team_member_id landed correctly,
 * and that the deactivated member's schedule doesn't get re-assigned to them.
 *
 * Cleans up everything it creates (bookings, schedules, team_members, client,
 * tenant) whether it passes or fails.
 *
 * Usage: npx tsx scripts/stress-test-recurring-smart-schedule.ts
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').replace(/\\n$/, '')
  }
}

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const BASE = 'http://localhost:3210'
const runId = `stress-${Date.now().toString(36)}`

// Mirrors src/app/api/admin-auth/route.ts createAdminToken() exactly.
function createAdminToken(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET!
  const payload = JSON.stringify({ role: 'super_admin', exp: Date.now() + 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

// Mirrors src/lib/impersonation.ts signImpersonation() exactly.
function signImpersonation(tenantId: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET!
  const hmac = crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
  return `${tenantId}.${hmac}`
}

// Mirrors src/lib/client-auth.ts createClientSession() exactly.
function createClientSession(clientId: string, tenantId: string): string {
  const secret = process.env.PORTAL_SECRET!
  const payload = `${clientId}.${tenantId}.${Date.now()}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

// Mirrors src/lib/tenant-header-sig.ts signTenantHeader() exactly — what
// middleware normally injects from the request's subdomain/host, needed here
// since getTenantFromHeaders() (used by /api/client/recurring) doesn't do
// impersonation-cookie tenant resolution like the admin routes do.
function signTenantHeader(tenantId: string): string {
  const secret = process.env.ADMIN_TOKEN_SECRET!
  return crypto.createHmac('sha256', secret).update(tenantId).digest('hex')
}

const results: { name: string; pass: boolean; detail: string }[] = []
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✓' : '✗'} ${name} — ${detail}`)
}

async function main() {
  console.log(`\n=== stress test: ${runId} ===\n`)

  // 1. Throwaway tenant
  const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
    name: `Stress ${runId}`, slug: `stress-${runId}`, industry: 'cleaning',
    email: `${runId}@example.com`, owner_email: `${runId}@example.com`,
    status: 'active', plan: 'starter',
  }).select('id').single()
  if (tErr || !tenant) throw new Error(`tenant create failed: ${tErr?.message}`)
  const tenantId = tenant.id
  console.log(`tenant: ${tenantId}`)

  const cleanupIds = { bookings: [] as string[], schedules: [] as string[], teamMembers: [] as string[], clients: [] as string[] }

  try {
    // 2. Two team members: one stays active, one gets deactivated mid-test.
    const { data: members, error: mErr } = await supabase.from('team_members').insert([
      { tenant_id: tenantId, name: 'Stress Active Member', status: 'active', working_days: ['0','1','2','3','4','5','6'], schedule: { '0': { start: '00:00', end: '23:59' }, '1': { start: '00:00', end: '23:59' }, '2': { start: '00:00', end: '23:59' }, '3': { start: '00:00', end: '23:59' }, '4': { start: '00:00', end: '23:59' }, '5': { start: '00:00', end: '23:59' }, '6': { start: '00:00', end: '23:59' } }, home_latitude: 40.7128, home_longitude: -74.0060 },
      { tenant_id: tenantId, name: 'Stress Soon-Deactivated Member', status: 'active', working_days: ['0','1','2','3','4','5','6'], schedule: { '0': { start: '00:00', end: '23:59' }, '1': { start: '00:00', end: '23:59' }, '2': { start: '00:00', end: '23:59' }, '3': { start: '00:00', end: '23:59' }, '4': { start: '00:00', end: '23:59' }, '5': { start: '00:00', end: '23:59' }, '6': { start: '00:00', end: '23:59' } }, home_latitude: 40.7128, home_longitude: -74.0060 },
    ]).select('id, name')
    if (mErr || !members) throw new Error(`team_members create failed: ${mErr?.message}`)
    cleanupIds.teamMembers.push(...members.map(m => m.id))
    const activeMember = members[0]
    const toDeactivate = members[1]
    console.log(`team members: active=${activeMember.id} toDeactivate=${toDeactivate.id}`)

    // 3. Test client, repeat-client gate satisfied via one completed booking,
    // lat/long set directly so smart-schedule skips geocoding.
    const { data: client, error: cErr } = await supabase.from('clients').insert({
      tenant_id: tenantId, name: 'Stress Test Client', email: `client-${runId}@example.com`,
      phone: '+18881000001', address: '123 Test St, New York, NY', latitude: 40.7128, longitude: -74.0060,
    }).select('id').single()
    if (cErr || !client) throw new Error(`client create failed: ${cErr?.message}`)
    cleanupIds.clients.push(client.id)
    const clientId = client.id

    const { error: priorErr } = await supabase.from('bookings').insert({
      tenant_id: tenantId, client_id: clientId, status: 'completed',
      start_time: new Date(Date.now() - 30 * 86400000).toISOString(),
      end_time: new Date(Date.now() - 30 * 86400000 + 3600000).toISOString(),
      hourly_rate: 79,
    }).select('id').single()
    if (priorErr) throw new Error(`prior completed booking failed: ${priorErr.message}`)

    const adminCookie = `admin_token=${createAdminToken()}; fl_impersonate=${signImpersonation(tenantId)}`
    const clientCookie = `client_session=${createClientSession(clientId, tenantId)}`

    // ── Test 1: admin-created schedule, no cleaner, no discount override — weekly ──
    const startDate1 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    const r1 = await fetch(`${BASE}/api/admin/recurring-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        client_id: clientId, recurring_type: 'weekly', start_date: startDate1,
        preferred_time: '10:00', duration_hours: 3, hourly_rate: 79,
      }),
    })
    const b1 = await r1.json()
    if (!r1.ok) throw new Error(`admin recurring-schedules POST failed: ${r1.status} ${JSON.stringify(b1)}`)
    cleanupIds.schedules.push(b1.schedule.id)
    const { data: sched1 } = await supabase.from('recurring_schedules').select('discount_percent').eq('id', b1.schedule.id).single()
    check('admin/weekly: discount_percent auto-derived = 20', sched1?.discount_percent === 20, `got ${sched1?.discount_percent}`)
    const { data: bookings1 } = await supabase.from('bookings').select('id, discount_percent, suggested_team_member_id').eq('schedule_id', b1.schedule.id)
    cleanupIds.bookings.push(...(bookings1 || []).map(b => b.id))
    check('admin/weekly: initial bookings carry discount_percent=20', (bookings1 || []).every(b => b.discount_percent === 20), JSON.stringify(bookings1?.map(b => b.discount_percent)))
    check('admin/weekly: initial bookings got suggested_team_member_id', (bookings1 || []).every(b => b.suggested_team_member_id === activeMember.id), JSON.stringify(bookings1?.map(b => b.suggested_team_member_id)))

    // ── Test 2: client self-book, no cleaner, monthly cadence ──
    const startDate2 = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
    const r2 = await fetch(`${BASE}/api/client/recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: clientCookie,
        'x-tenant-id': tenantId,
        'x-tenant-sig': signTenantHeader(tenantId),
      },
      body: JSON.stringify({
        client_id: clientId, frequency: 'monthly', start_date: startDate2,
        time: '11:00', hours: 3, service_type: 'Standard Cleaning',
      }),
    })
    const b2 = await r2.json()
    if (!r2.ok) throw new Error(`client recurring POST failed: ${r2.status} ${JSON.stringify(b2)}`)
    cleanupIds.schedules.push(b2.schedule_id)
    const { data: sched2 } = await supabase.from('recurring_schedules').select('discount_percent').eq('id', b2.schedule_id).single()
    check('client/monthly: discount_percent persisted = 10', sched2?.discount_percent === 10, `got ${sched2?.discount_percent}`)
    const { data: bookings2 } = await supabase.from('bookings').select('id, suggested_team_member_id').eq('schedule_id', b2.schedule_id)
    cleanupIds.bookings.push(...(bookings2 || []).map(b => b.id))
    check('client/monthly: initial bookings got suggested_team_member_id', (bookings2 || []).some(b => b.suggested_team_member_id === activeMember.id), JSON.stringify(bookings2?.map(b => b.suggested_team_member_id)))

    // ── Test 3: admin-created schedule WITH a cleaner, who then gets deactivated ──
    const startDate3 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
    const r3 = await fetch(`${BASE}/api/admin/recurring-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        client_id: clientId, team_member_id: toDeactivate.id, recurring_type: 'biweekly',
        start_date: startDate3, preferred_time: '09:00', duration_hours: 2, hourly_rate: 79,
        dates: [startDate3], // one initial booking only — cron will extend it
      }),
    })
    const b3 = await r3.json()
    if (!r3.ok) throw new Error(`admin recurring-schedules (assigned) POST failed: ${r3.status} ${JSON.stringify(b3)}`)
    cleanupIds.schedules.push(b3.schedule.id)
    const { data: bookings3init } = await supabase.from('bookings').select('id').eq('schedule_id', b3.schedule.id)
    cleanupIds.bookings.push(...(bookings3init || []).map(b => b.id))
    // Force next_generate_after into the past so the cron actually extends this schedule.
    await supabase.from('recurring_schedules').update({ next_generate_after: startDate3 }).eq('id', b3.schedule.id)

    // Deactivate the assigned member.
    await supabase.from('team_members').update({ status: 'inactive' }).eq('id', toDeactivate.id)

    // ── Test 4: real cron pass ──
    const cronRes = await fetch(`${BASE}/api/cron/generate-recurring`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const cronBody = await cronRes.text()
    check('cron: endpoint returned 200', cronRes.ok, `${cronRes.status} ${cronBody.slice(0, 200)}`)

    const { data: bookings3after } = await supabase.from('bookings').select('id, team_member_id, suggested_team_member_id, discount_percent, start_time').eq('schedule_id', b3.schedule.id).order('start_time')
    const newRows = (bookings3after || []).filter(b => !cleanupIds.bookings.includes(b.id))
    cleanupIds.bookings.push(...newRows.map(b => b.id))
    check('cron: generated new occurrences for the schedule', newRows.length > 0, `${newRows.length} new rows`)
    check('cron: deactivated member NOT assigned to any new occurrence', newRows.every(b => b.team_member_id !== toDeactivate.id), JSON.stringify(newRows.map(b => b.team_member_id)))
    check('cron: new occurrences got a suggested_team_member_id instead', newRows.every(b => b.suggested_team_member_id === activeMember.id), JSON.stringify(newRows.map(b => b.suggested_team_member_id)))

    console.log(`\n${results.filter(r => r.pass).length}/${results.length} checks passed\n`)
  } finally {
    console.log('cleaning up…')
    if (cleanupIds.bookings.length) await supabase.from('bookings').delete().in('id', cleanupIds.bookings)
    if (cleanupIds.schedules.length) await supabase.from('recurring_schedules').delete().in('id', cleanupIds.schedules)
    if (cleanupIds.clients.length) await supabase.from('bookings').delete().in('client_id', cleanupIds.clients) // any stray (e.g. the prior-completed one)
    if (cleanupIds.clients.length) await supabase.from('clients').delete().in('id', cleanupIds.clients)
    if (cleanupIds.teamMembers.length) await supabase.from('team_members').delete().in('id', cleanupIds.teamMembers)
    await supabase.from('tenants').delete().eq('id', tenantId)
    console.log('purged')
  }

  const failed = results.filter(r => !r.pass)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch(e => { console.error('[fatal]', e); process.exit(1) })
