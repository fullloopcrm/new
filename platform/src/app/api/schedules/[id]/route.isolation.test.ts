import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * schedules/[id] PUT — mass-assignment regression test.
 *
 * BUG (fixed here): the route spread the ENTIRE request body into
 * `recurring_schedules.update(body)` with no column allow-list. The
 * `.eq('tenant_id', tenantId)` filter scopes WHICH row is selected, but the
 * caller controlled every column on their own row — including `tenant_id`
 * (row donation into another tenant's books) and `client_id`/`team_member_id`/
 * `service_type_id` (cross-tenant FK injection).
 *
 * FIX: only recurring_type/day_of_week/preferred_time/duration_hours/notes/
 * special_instructions are now assignable; tenant_id and the FK columns are
 * dropped even if present in the body.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { PUT } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, client_id: 'c-a', team_member_id: 'tm-a', service_type_id: 'st-a', recurring_type: 'weekly' },
    ],
  }
}

function putReq(body: unknown): Request {
  return { url: 'http://t/api/schedules/rs-a', json: async () => body } as unknown as Request
}
function ctx() {
  return { params: Promise.resolve({ id: 'rs-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('schedules/[id] PUT — mass-assignment guard', () => {
  it('drops tenant_id from the body — the row is never donated to another tenant', async () => {
    const res = await PUT(putReq({ notes: 'updated', tenant_id: OTHER_TENANT }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(upd!.values.tenant_id).toBeUndefined()
    const row = h.seed.recurring_schedules.find((r) => r.id === 'rs-a')!
    expect(row.tenant_id).toBe(CTX_TENANT)
  })

  it('drops client_id/team_member_id/service_type_id FK columns from the body', async () => {
    const res = await PUT(putReq({ client_id: 'c-b', team_member_id: 'tm-b', service_type_id: 'st-b' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(upd!.values.client_id).toBeUndefined()
    expect(upd!.values.team_member_id).toBeUndefined()
    expect(upd!.values.service_type_id).toBeUndefined()
  })

  it('allow-listed fields still update normally', async () => {
    const res = await PUT(putReq({ notes: 'new notes', day_of_week: 3 }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'recurring_schedules')
    expect(upd!.values.notes).toBe('new notes')
    expect(upd!.values.day_of_week).toBe(3)
  })
})
