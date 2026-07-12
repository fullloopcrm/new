import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/finance/entities (POST converted to tenantDb).
 *
 * GET reads via listEntities(), already tenant-scoped. POST converts the two
 * direct `entities` accesses:
 *   • the make_default "unset existing default" UPDATE — tenantDb scopes it so it
 *     can NEVER clear another tenant's default entity;
 *   • the INSERT — tenantDb stamps tenant_id last, so a forged body value loses.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { GET, POST } from './route'

function seed() {
  return {
    entities: [
      { id: 'ent-a', tenant_id: A, name: 'A Co', is_default: true, active: true },
      { id: 'ent-b', tenant_id: B, name: 'B Co', is_default: true, active: true },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/entities — tenant isolation', () => {
  it("GET returns only the acting tenant's entities", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.entities as Array<{ id: string }>).map((e) => e.id)
    expect(ids).toEqual(['ent-a'])
    expect(ids).not.toContain('ent-b')
  })

  it("POST make_default never clears a foreign tenant's default, and stamps the acting tenant", async () => {
    const req = new Request('http://t/api/finance/entities', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: B, name: 'A Co 2', make_default: true }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Insert stamped for A despite the forged body tenant_id.
    expect(body.entity.tenant_id).toBe(A)

    const rows = h.seed.entities as Array<{ id: string; tenant_id: string; is_default: boolean }>
    // Tenant B's default was untouched by A's make_default unset.
    expect(rows.find((r) => r.id === 'ent-b')?.is_default).toBe(true)
    // Tenant A's prior default was cleared.
    expect(rows.find((r) => r.id === 'ent-a')?.is_default).toBe(false)
  })
})
