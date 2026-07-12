import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant write to `crew_members` via PATCH /api/crews.
 *
 * See deploy-prep/join-table-ownership-audit.md §3.1. `crew_members` has no
 * `tenant_id`; `setMembers()` scopes its delete/insert by `crew_id` ALONE, and
 * PATCH passes the caller-supplied `body.id` straight through with NO ownership
 * check. So a caller in tenant A can name tenant B's crew and:
 *   1. WIPE B's crew roster (`delete().eq('crew_id', <B crew>)`), and
 *   2. POLLUTE B's crew with A's own members.
 *
 * These tests assert the leak is CURRENTLY LIVE. When the parent-ownership guard
 * lands (§3.1: 404 on a foreign crew id before any member write), FLIP them to
 * expect status 404 and an untouched victim roster — turning this file into the
 * regression lock for the fix.
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

describe('crews PATCH — join-table (crew_members) cross-tenant WITNESS', () => {
  it('LEAK: a foreign crew id wipes the victim tenant\'s crew_members roster', async () => {
    const res = await PATCH(patchReq({ id: 'crew-b', member_ids: [] }))

    // Currently succeeds — the route does not 404 a foreign crew id.
    expect(res.status).toBe(200)

    // Victim's roster is gone: the delete scoped by crew_id alone reached tenant B.
    const remaining = h.seed.crew_members.filter((r) => r.crew_id === 'crew-b')
    expect(remaining).toHaveLength(0)

    const del = h.capture.deletes.find((d) => d.table === 'crew_members')
    expect(del).toBeTruthy()
    expect(del!.matched).toHaveLength(2)
  })

  it('LEAK: the follow-up insert pollutes the victim crew with the attacker\'s own member', async () => {
    const res = await PATCH(patchReq({ id: 'crew-b', member_ids: ['tm-a1'] }))
    expect(res.status).toBe(200)

    // Attacker's member (tenant A) is now attached to the victim's crew (tenant B).
    const injected = h.seed.crew_members.find(
      (r) => r.crew_id === 'crew-b' && r.team_member_id === 'tm-a1',
    )
    expect(injected).toBeTruthy()

    // And the victim's original members were removed in the same call.
    const victimOriginal = h.seed.crew_members.filter(
      (r) => r.crew_id === 'crew-b' && (r.team_member_id === 'tm-b1' || r.team_member_id === 'tm-b2'),
    )
    expect(victimOriginal).toHaveLength(0)
  })
})
