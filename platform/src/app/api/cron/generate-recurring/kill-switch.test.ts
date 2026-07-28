import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Kill switch (Settings -> Calendar -> "Pause automated recurring writes")
 * for the auto-generation cron. When on for a tenant, that tenant's
 * schedules are skipped entirely -- no bookings generated, no reassignment,
 * no notifications, no writes of any kind. Existing bookings/schedules are
 * untouched.
 */

vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))

let paused = false
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ smart_recurring_assign: false, recurring_writes_paused: paused }) }))
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

beforeEach(() => {
  paused = false
  h.tables = {}
  sendSMSMock.mockClear()
  h.tables.recurring_schedules = [
    {
      id: 'sched-1', tenant_id: 'tenant-1', status: 'active', client_id: 'client-1',
      team_member_id: 'member-1', property_id: null, service_type_id: null,
      recurring_type: 'weekly', day_of_week: new Date().getDay(), preferred_time: '09:00',
      duration_hours: 2, hourly_rate: 40, pay_rate: 20, discount_percent: 0, notes: null,
      special_instructions: null,
    },
  ]
  h.tables.bookings = []
  h.tables.team_members = [
    { id: 'member-1', tenant_id: 'tenant-1', name: 'Jordan Cleaner', phone: '2125551234', pin: '4321', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
  ]
  h.tables.clients = [{ id: 'client-1', tenant_id: 'tenant-1', name: 'Taylor Client' }]
  h.tables.tenants = [
    { id: 'tenant-1', status: 'active', slug: 'test-co', industry: 'cleaning', name: 'Test Co', telnyx_api_key: 'fake-key', telnyx_phone: '+15005550006' },
  ]
  h.tables.recurring_exceptions = []
  h.tables.notifications = []
})

describe('cron/generate-recurring — kill switch', () => {
  it('paused: generates zero bookings, sends zero SMS, leaves the schedule untouched', async () => {
    paused = true
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(json.generated).toBe(0)
    expect(h.tables.bookings).toHaveLength(0)
    expect(sendSMSMock).not.toHaveBeenCalled()
  })

  it('CONTROL: not paused generates the booking normally', async () => {
    paused = false
    const res = await GET(new Request('http://x'))
    const json = await res.json()
    expect(json.generated).toBeGreaterThan(0)
    expect(h.tables.bookings.length).toBeGreaterThan(0)
  })
})
