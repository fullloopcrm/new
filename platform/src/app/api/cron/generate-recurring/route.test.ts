import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Auto-resume must be platform-wide, not NYC Maid-only ─────────────────
// The paused-schedule auto-resume block used to filter by
// .eq('tenant_id', NYCMAID_TENANT_ID), so any other tenant's paused
// recurring schedule would never auto-resume once its pause window elapsed.
// This asserts the resumable-schedules query carries NO tenant_id filter
// (platform-wide, matching the unscoped `status = active` fetch below it)
// and that every returned schedule gets resumed.

type Call = { method: string; args: unknown[] }
type Query = { table: string; calls: Call[] }

let queries: Query[] = []
let resumableRows: Array<{ id: string }> = []
const updatedIds: string[] = []

function makeBuilder(table: string) {
  const record: Query = { table, calls: [] }
  queries.push(record)
  const builder: Record<string, unknown> = {}
  const chain = ['select', 'eq', 'neq', 'lte', 'gte', 'order', 'limit', 'update', 'insert', 'not']
  for (const m of chain) {
    builder[m] = vi.fn((...args: unknown[]) => {
      record.calls.push({ method: m, args })
      return builder
    })
  }
  builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }))
  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'recurring_schedules') {
      const hasEqId = record.calls.some((c) => c.method === 'eq' && c.args[0] === 'id')
      const isUpdate = record.calls.some((c) => c.method === 'update')
      if (isUpdate && hasEqId) {
        const id = record.calls.find((c) => c.method === 'eq' && c.args[0] === 'id')?.args[1]
        updatedIds.push(String(id))
        return resolve({ data: null, error: null })
      }
      const hasPausedFilter = record.calls.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'paused')
      if (hasPausedFilter) {
        return resolve({ data: resumableRows, error: null })
      }
      // the main "active" schedules fetch — empty so the generation loop is a no-op
      return resolve({ data: [], error: null })
    }
    return resolve({ data: [], error: null })
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}))

vi.mock('@/lib/recurring', () => ({ generateRecurringDates: vi.fn(() => []) }))
vi.mock('@/lib/day-availability', () => ({ worksScheduledDay: vi.fn(() => true), slotWithinHours: vi.fn(() => true) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/client-properties', () => ({ getBookingAddress: vi.fn(async () => null) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: vi.fn(async () => []), pickBestTeam: vi.fn(() => ({ lead: null })) }))

import { GET } from './route'

describe('cron/generate-recurring — auto-resume is platform-wide', () => {
  beforeEach(() => {
    queries = []
    updatedIds.length = 0
    resumableRows = []
    process.env.CRON_SECRET = 'test-secret'
  })

  function makeRequest() {
    return new Request('https://example.com/api/cron/generate-recurring', {
      headers: { authorization: 'Bearer test-secret' },
    })
  }

  it('queries resumable paused schedules with no tenant_id filter', async () => {
    resumableRows = [{ id: 'sched-tenant-a' }, { id: 'sched-tenant-b' }]

    await GET(makeRequest())

    const resumableQuery = queries.find(
      (q) => q.table === 'recurring_schedules' && q.calls.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'paused')
    )
    expect(resumableQuery).toBeTruthy()
    const scopedByTenant = resumableQuery!.calls.some((c) => c.method === 'eq' && c.args[0] === 'tenant_id')
    expect(scopedByTenant).toBe(false)
  })

  it('resumes every returned paused schedule regardless of tenant', async () => {
    resumableRows = [{ id: 'sched-tenant-a' }, { id: 'sched-tenant-b' }]

    await GET(makeRequest())

    expect(updatedIds).toEqual(['sched-tenant-a', 'sched-tenant-b'])
  })

  it('rejects requests without a valid CRON_SECRET', async () => {
    const res = await GET(new Request('https://example.com/api/cron/generate-recurring'))
    expect(res.status).toBe(401)
  })
})
