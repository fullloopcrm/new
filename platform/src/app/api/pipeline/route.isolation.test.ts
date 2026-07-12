import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/pipeline (converted to tenantDb).
 *
 * The Kanban snapshot reads active `deals` through tenantDb, so a foreign
 * tenant's deal never appears in another tenant's stage columns, stage totals,
 * or deal count. Seeds use a valid stage ('new') so the probe exercises the
 * normal grouping path.
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

import { GET } from './route'

function seed() {
  return {
    deals: [
      { id: 'd-a1', tenant_id: A, status: 'active', stage: 'new', value_cents: 100000, probability: 50, expected_close_date: null, clients: { id: 'cl-a', name: 'Client A' } },
      { id: 'd-b1', tenant_id: B, status: 'active', stage: 'new', value_cents: 999999, probability: 90, expected_close_date: null, clients: { id: 'cl-b', name: 'Client B' } },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('pipeline — tenant isolation', () => {
  it("stage columns, totals, and count exclude a foreign tenant's deals", async () => {
    const res = await GET(new Request('http://t/api/pipeline'))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.total).toBe(1)

    const allIds = Object.values(body.byStage as Record<string, Array<{ id: string }>>)
      .flat()
      .map((d) => d.id)
    expect(allIds).toEqual(['d-a1'])
    expect(allIds).not.toContain('d-b1')

    const newStage = (body.stageTotals as Array<{ stage: string; count: number }>).find((s) => s.stage === 'new')
    expect(newStage?.count).toBe(1)
  })
})
