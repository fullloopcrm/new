import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Dry-run proof that the new assignment-SMS logic in generate-recurring
 * actually fires on a real invocation of GET(), with zero network calls —
 * sendSMS is mocked so no real Telnyx request/real cleaner text ever goes
 * out. This is the safe substitute for a live production trigger.
 */

vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ smart_recurring_assign: false }) }))
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

beforeEach(() => {
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
  h.tables.bookings = [] // no prior bookings — isFirstGeneration = true
  h.tables.team_members = [
    { id: 'member-1', tenant_id: 'tenant-1', name: 'Jordan Cleaner', phone: '2125551234', pin: '4321', status: 'active', working_days: null, schedule: null, unavailable_dates: null },
  ]
  h.tables.clients = [{ id: 'client-1', tenant_id: 'tenant-1', name: 'Taylor Client' }]
  h.tables.tenants = [
    { id: 'tenant-1', slug: 'test-co', industry: 'cleaning', name: 'Test Co', telnyx_api_key: 'fake-key', telnyx_phone: '+15005550006' },
  ]
  h.tables.recurring_exceptions = []
  h.tables.notifications = []
})

describe('generate-recurring — assignment SMS actually fires (dry run, no real network)', () => {
  it('sends a job-assignment SMS to the cleaner on a schedule\'s first-ever generation and logs it as sent', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('https://x/api/cron/generate-recurring'))
    expect(res.status).toBe(200)
    // notifyAssignment is intentionally fire-and-forget (matches the other
    // two SMS paths in this codebase) — the response returns before it
    // settles, so give its microtasks a chance to flush.
    await vi.waitFor(() => expect(sendSMSMock).toHaveBeenCalledTimes(1))
    // sendSMS is mocked out entirely (no real network), so E.164
    // normalization -- which happens INSIDE the real sendSMS -- never runs
    // here. Assert the raw value the route hands off, matching what the
    // other two working assignment-SMS paths in this codebase also pass.
    const call = sendSMSMock.mock.calls[0]?.[0]
    expect(call?.to).toBe('2125551234')
    expect(call?.telnyxApiKey).toBe('fake-key')
    expect(call?.body.length ?? 0).toBeGreaterThan(10)

    const logged = h.tables.notifications.filter((n) => n.type === 'team_assignment')
    expect(logged.length).toBe(1)
    expect(logged[0].status).toBe('sent')
    expect(logged[0].recipient_id).toBe('member-1')
  })

  it('does NOT re-send on the SAME schedule\'s second cron run (not first-generation anymore)', async () => {
    // Simulate a prior booking already existing for this schedule.
    h.tables.bookings = [{ id: 'prior-bk', schedule_id: 'sched-1', tenant_id: 'tenant-1', start_time: new Date().toISOString() }]
    const { GET } = await import('./route')
    await GET(new Request('https://x/api/cron/generate-recurring'))
    expect(sendSMSMock).not.toHaveBeenCalled()
  })
})
