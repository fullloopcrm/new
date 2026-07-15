import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * REGRESSION LOCK — cross-tenant write to `crew_members` via PATCH /api/crews.
 *
 * See deploy-prep/cross-tenant-leak-register.md P0. `crew_members` has no
 * `tenant_id`; `setMembers()` scopes its delete/insert by `crew_id` ALONE. A
 * caller in tenant A used to be able to name tenant B's crew and:
 *   1. WIPE B's crew roster (`delete().eq('crew_id', <B crew>)`), and
 *   2. POLLUTE B's crew with A's own members.
 *
 * Fixed: PATCH now verifies the crew belongs to `tenantId` (tenantDb-scoped
 * lookup) and 404s before any member write; `setMembers()` re-checks the same
 * ownership as its first line so every caller is covered by construction, not
 * just this one call site. These tests were flipped from LEAK to LOCK — they
 * now prove a foreign crew id 404s and the victim roster is untouched.
 */

const CTX_TENANT = 'tid-a' // attacker (the caller)
const OTHER_TENANT = 'tid-b' // victim

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { PATCH } from './route'

function seed() {
  return {
    crews: [
      { id: 'crew-a', tenant_id: CTX_TENANT, name: 'Alpha', color: null, active: true },
      { id: 'crew-b', tenant_id: OTHER_TENANT, name: 'Bravo', color: null, active: true },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: CTX_TENANT, name: 'A-One' },
      { id: 'tm-b1', tenant_id: OTHER_TENANT, name: 'B-One' },
      { id: 'tm-b2', tenant_id: OTHER_TENANT, name: 'B-Two' },
    ],
    // Victim (tenant B) crew already has a two-member roster.
    crew_members: [
      { crew_id: 'crew-b', team_member_id: 'tm-b1' },
      { crew_id: 'crew-b', team_member_id: 'tm-b2' },
    ],
  }
}

function patchReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('crews PATCH — join-table (crew_members) cross-tenant LOCK', () => {
  it('BLOCKED: a foreign crew id 404s and never reaches the crew_members delete', async () => {
    const res = await PATCH(patchReq({ id: 'crew-b', member_ids: [] }))

    expect(res.status).toBe(404)

    // Victim's roster is untouched — the delete never ran.
    const remaining = h.seed.crew_members.filter((r) => r.crew_id === 'crew-b')
    expect(remaining).toHaveLength(2)

    const del = h.capture.deletes.find((d) => d.table === 'crew_members')
    expect(del).toBeUndefined()
  })

  it('BLOCKED: a foreign crew id cannot be polluted with the attacker\'s own member', async () => {
    const res = await PATCH(patchReq({ id: 'crew-b', member_ids: ['tm-a1'] }))
    expect(res.status).toBe(404)

    // Attacker's member was never attached to the victim's crew.
    const injected = h.seed.crew_members.find(
      (r) => r.crew_id === 'crew-b' && r.team_member_id === 'tm-a1',
    )
    expect(injected).toBeFalsy()

    // Victim's original members are still intact.
    const victimOriginal = h.seed.crew_members.filter(
      (r) => r.crew_id === 'crew-b' && (r.team_member_id === 'tm-b1' || r.team_member_id === 'tm-b2'),
    )
    expect(victimOriginal).toHaveLength(2)
  })

  it('positive control: the caller\'s own crew id still updates its members normally', async () => {
    const res = await PATCH(patchReq({ id: 'crew-a', member_ids: ['tm-a1'] }))
    expect(res.status).toBe(200)

    const injected = h.seed.crew_members.find(
      (r) => r.crew_id === 'crew-a' && r.team_member_id === 'tm-a1',
    )
    expect(injected).toBeTruthy()
  })
})
