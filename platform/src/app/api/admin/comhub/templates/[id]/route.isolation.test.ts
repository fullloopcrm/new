import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/comhub/templates/[id] — tenantDb() conversion wrong-tenant probe
 * (P1/W1 queue-a). `id` is a caller-supplied URL param — verifies tenant A
 * cannot archive tenant B's template via a guessed/reused template id.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))

import { DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    comhub_templates: [
      { id: 't-A1', tenant_id: 'tenant-A', archived_at: null },
      { id: 't-B1', tenant_id: 'tenant-B', archived_at: null },
    ],
  }
})

describe('DELETE /api/admin/comhub/templates/[id] — tenant isolation', () => {
  it("tenant A cannot archive tenant B's template (row stays live)", async () => {
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('t-B1') })
    expect(res.status).toBe(200)
    const row = h.store.comhub_templates.find((t) => t.id === 't-B1')
    expect(row?.archived_at).toBeNull()
  })

  it("tenant A can archive its own template", async () => {
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('t-A1') })
    expect(res.status).toBe(200)
    const row = h.store.comhub_templates.find((t) => t.id === 't-A1')
    expect(row?.archived_at).toBeTruthy()
  })
})
