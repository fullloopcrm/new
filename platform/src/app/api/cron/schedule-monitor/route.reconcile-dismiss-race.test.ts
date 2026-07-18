/**
 * GET /api/cron/schedule-monitor — self-healing reconcile clobbering a
 * concurrent admin dismissal.
 *
 * The NYC Maid reconcile step reads every open/acknowledged schedule_issues
 * row for the tenant, computes which are stale (past-dated or no longer in
 * the freshly-computed issue set), then bulk-UPDATEs those ids straight to
 * status:'resolved', resolved_by:'auto' — with no re-check of the row's
 * CURRENT status at write time. PUT /api/admin/schedule-issues lets an
 * admin explicitly set a row to 'dismissed' (a deliberate "not a real
 * issue" call, distinct from an auto-resolve) at any moment. An admin
 * dismissal landing in the gap between the reconcile's SELECT and its
 * UPDATE got silently overwritten back to 'resolved'/'auto', erasing the
 * admin's explicit call with no error or signal — same overwrite-race class
 * as this session's cron/lifecycle and cron/generate-recurring fixes.
 *
 * Fix: the reconcile UPDATE now re-checks `.in('status', ['open',
 * 'acknowledged'])` in its own WHERE, so a status change to anything else
 * in the gap (like an admin's dismissal) makes the row no longer match and
 * the bulk update becomes a no-op for it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    const realFake = h.fake!
    return {
      from(table: string) {
        const builder = realFake.from(table)
        if (table === 'schedule_issues') {
          const origUpdate = builder.update.bind(builder)
          // Simulates PUT /api/admin/schedule-issues landing in the exact
          // gap between the reconcile's openIssues SELECT and its bulk
          // resolve UPDATE -- an admin explicitly dismissing the row a
          // beat before the cron's own write lands.
          builder.update = ((vals: Record<string, unknown>) => {
            if (vals.resolved_by === 'auto') {
              const row = realFake._all('schedule_issues').find((r) => r.id === 'issue-1')
              if (row) row.status = 'dismissed'
            }
            return origUpdate(vals)
          }) as typeof builder.update
        }
        return builder
      },
    }
  },
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/schedule-monitor', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined
let savedTZ: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  savedTZ = process.env.TZ
  process.env.TZ = 'America/New_York'

  h.fake = createFakeSupabase({
    tenants: [{ id: NYCMAID_TENANT_ID, name: 'The NYC Maid', status: 'active' }],
    bookings: [],
    schedule_issues: [{
      id: 'issue-1', tenant_id: NYCMAID_TENANT_ID, message: 'Stale issue, condition cleared',
      date: '2026-07-15', status: 'acknowledged', booking_ids: [],
    }],
  })

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z')) // 2pm EDT
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  if (savedTZ === undefined) delete process.env.TZ
  else process.env.TZ = savedTZ
  vi.useRealTimers()
})

describe('cron/schedule-monitor self-healing reconcile vs a concurrent admin dismissal', () => {
  it('leaves an admin-dismissed issue as dismissed instead of overwriting it to auto-resolved', async () => {
    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const row = h.fake!._all('schedule_issues').find((r) => r.id === 'issue-1')
    expect(row?.status).toBe('dismissed')
    expect(row?.resolved_by).not.toBe('auto')
  })
})
