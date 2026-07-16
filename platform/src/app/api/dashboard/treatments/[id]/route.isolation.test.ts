import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/treatments/[id] — PATCH/DELETE tenant isolation probe.
 * `id` is caller-supplied; verifies tenant A cannot touch tenant B's log by
 * guessing its id, same shape as the hr/documents [id] route tests.
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
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: 'owner' }, error: null }),
}))

import { PATCH, DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })
const patchReq = (body: unknown) => new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const deleteReq = () => new NextRequest('http://x', { method: 'DELETE' })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    pest_treatment_logs: [
      { id: 'log-B1', tenant_id: 'tenant-B', target_pest: 'termite', product_name: 'Termidor', application_method: 'injection' },
    ],
  }
})

describe('PATCH /api/dashboard/treatments/[id] — tenant isolation', () => {
  it("tenant A cannot update tenant B's log even by guessing its id", async () => {
    h.tenantId = 'tenant-A'
    const res = await PATCH(patchReq({ target_pest: 'roach' }), { params: params('log-B1') })
    expect(res.status).toBe(404)
    const log = h.store.pest_treatment_logs.find((l) => l.id === 'log-B1')
    expect(log?.target_pest).toBe('termite')
  })

  it('rejects clearing target_pest to empty', async () => {
    h.store.pest_treatment_logs.push({ id: 'log-A1', tenant_id: 'tenant-A', target_pest: 'ant', product_name: 'X' })
    const res = await PATCH(patchReq({ target_pest: '  ' }), { params: params('log-A1') })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/dashboard/treatments/[id] — tenant isolation', () => {
  it("tenant A's delete call does not remove tenant B's log", async () => {
    h.tenantId = 'tenant-A'
    const res = await DELETE(deleteReq(), { params: params('log-B1') })
    expect(res.status).toBe(200)
    expect(h.store.pest_treatment_logs.some((l) => l.id === 'log-B1')).toBe(true)
  })
})
