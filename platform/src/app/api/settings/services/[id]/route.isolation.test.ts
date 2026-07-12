import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/settings/services/[id] (converted to tenantDb).
 *
 * PUT/DELETE address a single `service_types` row by path id. tenantDb injects
 * .eq('tenant_id'), so a foreign id matches no row for the acting tenant:
 *   • PUT on a foreign id → .single() finds nothing → 500, foreign row untouched.
 *   • DELETE on a foreign id → matches nothing → no-op, foreign row survives.
 * Own-tenant rows edit/delete normally.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { PUT, DELETE } from './route'

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function seed() {
  return {
    service_types: [
      { id: 'svc-a1', tenant_id: A, name: 'Standard Clean', active: true },
      { id: 'svc-b1', tenant_id: B, name: 'Foreign Deep Clean', active: true },
    ],
    audit_logs: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('settings/services/[id] — tenant isolation', () => {
  it('PUT edits the acting tenant own row', async () => {
    const req = new Request('http://t/api/settings/services/svc-a1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Renamed Clean' }),
    })
    const res = await PUT(req, params('svc-a1'))
    expect(res.status).toBe(200)
    expect(h.seed.service_types.find((r) => r.id === 'svc-a1')!.name).toBe('Renamed Clean')
  })

  it('PUT cannot edit a foreign tenant row', async () => {
    const req = new Request('http://t/api/settings/services/svc-b1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'HIJACKED' }),
    })
    const res = await PUT(req, params('svc-b1'))
    expect(res.status).toBe(500) // .single() finds no row for tenant A
    const updates = h.capture.updates.filter((u) => u.table === 'service_types')
    expect(updates.every((u) => u.matched.length === 0)).toBe(true)
    expect(h.seed.service_types.find((r) => r.id === 'svc-b1')!.name).toBe('Foreign Deep Clean')
  })

  it('DELETE cannot remove a foreign tenant row', async () => {
    const res = await DELETE(new Request('http://t/api/settings/services/svc-b1', { method: 'DELETE' }), params('svc-b1'))
    expect(res.status).toBe(200) // no-op delete still reports success
    const deletes = h.capture.deletes.filter((d) => d.table === 'service_types')
    expect(deletes.every((d) => d.matched.length === 0)).toBe(true)
    expect(h.seed.service_types.some((r) => r.id === 'svc-b1')).toBe(true)
  })

  it('DELETE removes the acting tenant own row', async () => {
    const res = await DELETE(new Request('http://t/api/settings/services/svc-a1', { method: 'DELETE' }), params('svc-a1'))
    expect(res.status).toBe(200)
    expect(h.seed.service_types.some((r) => r.id === 'svc-a1')).toBe(false)
  })
})
