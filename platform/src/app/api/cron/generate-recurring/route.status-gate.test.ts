import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * generate-recurring cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session
 * (Telegram, Telnyx SMS/voice webhooks, comhub-email cron): recurring_schedules
 * carries no tenant status of its own, and this loop never checked
 * tenantServesSite() before materializing brand-new future bookings and
 * assigning real staff to them. Unlike the messaging-only crons, this one
 * WRITES new operational data — a suspended/cancelled/deleted tenant's
 * recurring schedule kept auto-generating indefinitely without this gate.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const ACTIVE_TENANT_ID = 't-active'
const SUSPENDED_TENANT_ID = 't-suspended'

let scheduleRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>
const insertedBookingsRows: unknown[][] = []

vi.mock('@/lib/recurring', () => ({
  generateRecurringDates: () => [new Date(Date.now() + 24 * 60 * 60 * 1000)],
}))
vi.mock('@/lib/day-availability', () => ({
  worksScheduledDay: () => true,
  slotWithinHours: () => true,
}))
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ smart_recurring_assign: false }),
}))
vi.mock('@/lib/client-properties', () => ({
  getBookingAddress: async () => ({ address: null, latitude: null, longitude: null }),
}))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => [],
  pickBestTeam: () => ({ lead: null }),
}))
vi.mock('@/lib/hr', () => ({
  getTerminatedTeamMemberIds: async () => [],
}))

function tenantsBuilder() {
  const eqs: Record<string, unknown> = {}
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return obj
    },
    in: (_col: string, vals: string[]) => {
      eqs.__in = vals
      return obj
    },
    single: async () => ({ data: eqs.id ? { status: tenantStatusMap[eqs.id as string] ?? null } : null, error: null }),
    then: (resolve: (v: unknown) => unknown) => {
      const ids = (eqs.__in as string[] | undefined) || []
      return Promise.resolve({ data: ids.map((id) => ({ id, status: tenantStatusMap[id] ?? null })), error: null }).then(resolve)
    },
  }
  return obj
}

function recurringSchedulesBuilder() {
  const eqs: Record<string, unknown> = {}
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return obj
    },
    lte: () => obj,
    update: () => obj,
    then: (resolve: (v: unknown) => unknown) => {
      if (eqs.status === 'paused') return Promise.resolve({ data: [], error: null }).then(resolve)
      return Promise.resolve({ data: scheduleRows, error: null }).then(resolve)
    },
  }
  return obj
}

function bookingsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    order: () => obj,
    limit: () => obj,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    insert: async (rows: unknown) => {
      insertedBookingsRows.push(Array.isArray(rows) ? rows : [rows])
      return { error: null }
    },
  }
  return obj
}

function defaultBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    single: async () => ({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    insert: async () => ({ error: null }),
  }
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return tenantsBuilder()
      if (table === 'recurring_schedules') return recurringSchedulesBuilder()
      if (table === 'bookings') return bookingsBuilder()
      return defaultBuilder()
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/generate-recurring', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

function baseSchedule(tenantId: string, id: string) {
  return {
    id,
    tenant_id: tenantId,
    status: 'active',
    recurring_type: 'weekly',
    day_of_week: 1,
    preferred_time: null,
    service_type_id: null,
    duration_hours: 2,
    team_member_id: null,
    hourly_rate: 50,
    pay_rate: 25,
    notes: null,
    special_instructions: null,
    property_id: null,
    client_id: 'client-1',
  }
}

beforeEach(() => {
  insertedBookingsRows.length = 0
  tenantStatusMap = { [NYCMAID_TENANT_ID]: 'active' }
})

describe('generate-recurring cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not auto-generate new bookings for a %s tenant, but still generates for an active tenant',
    async (status) => {
      tenantStatusMap[SUSPENDED_TENANT_ID] = status
      tenantStatusMap[ACTIVE_TENANT_ID] = 'active'
      scheduleRows = [
        baseSchedule(SUSPENDED_TENANT_ID, 'sched-suspended'),
        baseSchedule(ACTIVE_TENANT_ID, 'sched-active'),
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      const generatedTenantIds = insertedBookingsRows.flat().map((r) => (r as { tenant_id: string }).tenant_id)
      expect(generatedTenantIds).not.toContain(SUSPENDED_TENANT_ID)
      expect(generatedTenantIds).toContain(ACTIVE_TENANT_ID)
      expect(body.generated).toBeGreaterThan(0)
    },
  )

  it.each(['active', 'setup', 'pending'])('still generates for a %s tenant', async (status) => {
    tenantStatusMap[ACTIVE_TENANT_ID] = status
    scheduleRows = [baseSchedule(ACTIVE_TENANT_ID, 'sched-1')]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.generated).toBeGreaterThan(0)
    const generatedTenantIds = insertedBookingsRows.flat().map((r) => (r as { tenant_id: string }).tenant_id)
    expect(generatedTenantIds).toContain(ACTIVE_TENANT_ID)
  })
})
