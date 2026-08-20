import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Per-schedule error isolation. Added 2026-08-19 (Jeff, ahead of running
 * this cron manually against all of production to extend every schedule
 * through Dec 31 -- "safely, cleanly, and stably"). Before this, the whole
 * for-loop over schedules had no try/catch: an uncaught throw anywhere in
 * one schedule's processing aborted the ENTIRE run, silently skipping every
 * remaining schedule with no completion signal beyond a raw 500. Never
 * surfaced while this only ever generated a few weeks at a time -- but the
 * year-end-refresh change means one run can now walk every active schedule
 * on the platform and insert up to a year of catch-up bookings for whichever
 * are behind, so one bad schedule taking the whole batch down is real blast
 * radius, not a theoretical one.
 */

vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))

const poisonTenantId = 'tenant-poison'
vi.mock('@/lib/settings', () => ({
  getSettings: async (tenantId: string) => {
    if (tenantId === poisonTenantId) throw new Error('simulated settings-lookup failure')
    return { smart_recurring_assign: false, recurring_writes_paused: false }
  },
}))
vi.mock('@/lib/recurring-team-suggest', () => ({ suggestTeamMemberForRecurring: async () => null }))
vi.mock('@/lib/client-properties', () => ({ getBookingAddress: async () => null }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [], pickBestTeam: () => ({ lead: null }) }))
vi.mock('@/lib/day-availability', () => ({ worksScheduledDay: () => true, slotWithinHours: () => true }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))
vi.mock('@/lib/nycmaid/tenant', () => ({ NYCMAID_TENANT_ID: 'nm-tenant' }))

type SendSmsArgs = { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }
const sendSMSMock = vi.fn(async (_args: SendSmsArgs) => ({ id: 'msg-fake' }))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: SendSmsArgs) => sendSMSMock(args) }))

const h = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]> }))

function tableChain(table: string) {
  const rows = () => h.tables[table] || (h.tables[table] = [])
  let filters: Array<(r: Record<string, unknown>) => boolean> = []
  let order: { col: string; asc: boolean } | null = null
  let lim: number | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: (col: string, opts: { ascending: boolean }) => { order = { col, asc: opts.ascending }; return c },
    limit: (n: number) => { lim = n; return c },
    single: async () => {
      const m = rows().filter((r) => filters.every((f) => f(r)))
      return { data: m[0] ?? null, error: m[0] ? null : { message: 'not found' } }
    },
    update: (patch: Record<string, unknown>) => ({
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val)
        return {
          eq: (col2: string, val2: unknown) => {
            filters.push((r) => r[col2] === val2)
            return { then: (resolve: (v: { data: null; error: null }) => void) => {
              for (const r of rows()) if (filters.every((f) => f(r))) Object.assign(r, patch)
              resolve({ data: null, error: null })
            } }
          },
          then: (resolve: (v: { data: null; error: null }) => void) => {
            for (const r of rows()) if (filters.every((f) => f(r))) Object.assign(r, patch)
            resolve({ data: null, error: null })
          },
        }
      },
    }),
    insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
      const arr = Array.isArray(payload) ? payload : [payload]
      const inserted = arr.map((p) => ({ id: `id-${rows().length}-${Math.floor(Math.random() * 1e6)}`, ...p }))
      rows().push(...inserted)
      return {
        select: () => ({
          then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: inserted, error: null }),
          single: async () => ({ data: inserted[0], error: null }),
        }),
        then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
      }
    },
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      let m = rows().filter((r) => filters.every((f) => f(r)))
      if (order) m = [...m].sort((a, b) => (order!.asc ? 1 : -1) * String(a[order!.col]).localeCompare(String(b[order!.col])))
      if (lim != null) m = m.slice(0, lim)
      resolve({ data: m, error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => tableChain(t) },
}))

import { GET } from './route'

function schedule(overrides: Record<string, unknown>) {
  return {
    id: 'sched-x', tenant_id: 'tenant-x', status: 'active', client_id: 'client-x',
    team_member_id: 'member-x', property_id: null, service_type_id: null,
    recurring_type: 'weekly', day_of_week: new Date().getDay(), preferred_time: '09:00',
    duration_hours: 2, hourly_rate: 40, pay_rate: 20, discount_percent: 0, notes: null,
    special_instructions: null,
    ...overrides,
  }
}

beforeEach(() => {
  h.tables = {}
  sendSMSMock.mockClear()
  h.tables.tenants = [
    { id: 'tenant-good', status: 'active', slug: 'good-co', industry: 'cleaning', name: 'Good Co', telnyx_api_key: 'fake-key', telnyx_phone: '+15005550006' },
    { id: poisonTenantId, status: 'active', slug: 'poison-co', industry: 'cleaning', name: 'Poison Co', telnyx_api_key: 'fake-key', telnyx_phone: '+15005550006' },
  ]
  h.tables.recurring_schedules = [
    schedule({ id: 'sched-poison', tenant_id: poisonTenantId, client_id: 'client-poison', team_member_id: 'member-poison' }),
    schedule({ id: 'sched-good', tenant_id: 'tenant-good', client_id: 'client-good', team_member_id: 'member-good' }),
  ]
  h.tables.bookings = []
  h.tables.team_members = [
    { id: 'member-poison', tenant_id: poisonTenantId, name: 'Poison Cleaner', phone: '2125551111', pin: '1111', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
    { id: 'member-good', tenant_id: 'tenant-good', name: 'Good Cleaner', phone: '2125552222', pin: '2222', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
  ]
  h.tables.clients = [
    { id: 'client-poison', tenant_id: poisonTenantId, name: 'Poison Client' },
    { id: 'client-good', tenant_id: 'tenant-good', name: 'Good Client' },
  ]
  h.tables.recurring_exceptions = []
  h.tables.notifications = []
})

describe('cron/generate-recurring — one bad schedule cannot take down the whole run', () => {
  it('a schedule whose processing throws is skipped, logged, and does not stop the good schedule from generating', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
    const json = await res.json()

    // The good schedule (processed either before or after the poison one,
    // depending on array order) still generated bookings.
    expect(json.generated).toBeGreaterThan(0)
    expect(json.failed_schedules).toBe(1)

    const goodBookings = h.tables.bookings.filter((b) => b.schedule_id === 'sched-good')
    const poisonBookings = h.tables.bookings.filter((b) => b.schedule_id === 'sched-poison')
    expect(goodBookings.length).toBeGreaterThan(0)
    expect(poisonBookings).toHaveLength(0)

    // The failure was actually recorded somewhere an admin can see it, not
    // just swallowed.
    const errorNotifications = h.tables.notifications.filter((n) => n.type === 'recurring_generation_error')
    expect(errorNotifications).toHaveLength(1)
    expect(String(errorNotifications[0].message)).toContain('sched-poison')
  })

  it('CONTROL: with no poison schedule, both schedules generate normally', async () => {
    h.tables.recurring_schedules = [
      schedule({ id: 'sched-a', tenant_id: 'tenant-good', client_id: 'client-good', team_member_id: 'member-good' }),
      schedule({ id: 'sched-b', tenant_id: 'tenant-good', client_id: 'client-good', team_member_id: 'member-good' }),
    ]
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(json.failed_schedules).toBe(0)
    expect(h.tables.bookings.filter((b) => b.schedule_id === 'sched-a').length).toBeGreaterThan(0)
    expect(h.tables.bookings.filter((b) => b.schedule_id === 'sched-b').length).toBeGreaterThan(0)
  })
})
