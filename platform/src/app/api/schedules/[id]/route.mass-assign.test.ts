/**
 * PUT /api/schedules/:id — mass-assignment / tenant-donation regression.
 *
 * The route used to spread the raw request body straight into `.update(body)`,
 * scoped only by `.eq('id', id).eq('tenant_id', tenantId)` on the WHERE side.
 * Nothing stopped the SET clause from including `tenant_id` (or the client_id/
 * team_member_id FK columns) — any authenticated tenant caller could reassign
 * one of their own recurring_schedules rows into a different tenant's
 * namespace. Fixed by allow-listing the editable scalar fields via `pick()`.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A, TENANT_B } = vi.hoisted(() => ({ TENANT_A: 'tenant-A', TENANT_B: 'tenant-B' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    recurring_schedules: [
      { id: 'sch-A1', tenant_id: TENANT_A, notes: 'old', recurring_type: 'weekly' },
      { id: 'sch-B1', tenant_id: TENANT_B, notes: 'old', recurring_type: 'weekly' },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

describe('PUT /api/schedules/:id — mass-assignment guard', () => {
  it('updates an allow-listed field on the caller tenant’s own schedule', async () => {
    const res = await PUT(putReq({ notes: 'new note' }), params('sch-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.notes).toBe('new note')
  })

  it('drops a tenant_id in the body instead of donating the schedule to another tenant', async () => {
    const res = await PUT(putReq({ notes: 'hacked', tenant_id: TENANT_B }), params('sch-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.schedule.tenant_id).toBe(TENANT_A)
    expect(fake._all('recurring_schedules').find((r) => r.id === 'sch-A1')?.tenant_id).toBe(TENANT_A)
  })

  it("tenant A can never update tenant B's schedule", async () => {
    const res = await PUT(putReq({ notes: 'hacked' }), params('sch-B1'))

    expect(res.status).toBe(500)
    expect(fake._all('recurring_schedules').find((r) => r.id === 'sch-B1')?.notes).toBe('old')
  })
})
