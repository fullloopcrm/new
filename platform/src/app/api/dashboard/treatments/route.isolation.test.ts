import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard/treatments — pest-control chemical/treatment application log
 * (P1/W1 queued item 1). Validates required-field/enum guards and that
 * tenantDb() actually isolates one tenant's logs from another's, the same
 * probe shape as the hr/documents route tests.
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

import { GET, POST } from './route'

const getReq = (qs = '') => new NextRequest(`http://x/api/dashboard/treatments${qs}`)
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    pest_treatment_logs: [
      {
        id: 'log-A1', tenant_id: 'tenant-A', target_pest: 'roach', product_name: 'Advion',
        application_method: 'bait', application_date: '2026-07-10',
      },
      {
        id: 'log-B1', tenant_id: 'tenant-B', target_pest: 'termite', product_name: 'Termidor',
        application_method: 'injection', application_date: '2026-07-11',
      },
    ],
  }
})

describe('GET /api/dashboard/treatments — tenant isolation', () => {
  it("tenant A only sees its own logs, never tenant B's", async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.logs.map((l: { id: string }) => l.id)).toEqual(['log-A1'])
  })
})

describe('POST /api/dashboard/treatments — validation', () => {
  it('rejects a missing target_pest', async () => {
    const res = await POST(postReq({ product_name: 'Advion' }))
    expect(res.status).toBe(400)
  })

  it('rejects a missing product_name', async () => {
    const res = await POST(postReq({ target_pest: 'roach' }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid application_method', async () => {
    const res = await POST(postReq({ target_pest: 'roach', product_name: 'Advion', application_method: 'wizardry' }))
    expect(res.status).toBe(400)
  })

  it('creates a log stamped with the caller tenant, defaulting method to spray', async () => {
    const res = await POST(postReq({ target_pest: 'ant', product_name: 'Termidor SC' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.log.tenant_id).toBe('tenant-A')
    expect(json.log.application_method).toBe('spray')
  })
})
