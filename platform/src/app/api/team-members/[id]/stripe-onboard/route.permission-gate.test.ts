import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/team-members/[id]/stripe-onboard — team.view gate.
 *
 * Called getTenantForRequest() directly with zero permission check, unlike
 * its own sibling POST (already gated on team.edit) and its companion GET
 * /api/team-members/[id]/stripe-status (already gated on team.view). Per
 * rbac.ts every role including 'staff' has team.view by DEFAULT, so this was
 * an override-only gap: a tenant that revoked team.view via its own
 * role_permissions customization would have that revocation silently
 * ignored on this route, letting a staff caller keep pulling a team
 * member's Stripe Connect account id + onboarding status.
 */

const h = vi.hoisted(() => ({
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

const roleHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenantId: 'tenant-A' as string,
  overrides: null as Record<string, Record<string, boolean>> | null,
}))

type State = { table: string; eqs: Record<string, unknown> }

function runQuery(state: State) {
  const rows = h.store[state.table] || []
  const found = rows.filter((r) => Object.entries(state.eqs).every(([k, v]) => r[k] === v))
  return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, eqs: {} }
      const chain: Record<string, unknown> = {
        select: () => chain,
        update: () => chain,
        eq: (col: string, val: unknown) => {
          state.eqs[col] = val
          return chain
        },
        single: () => Promise.resolve(runQuery(state)),
      }
      return chain
    },
  }
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient() }))
vi.mock('stripe', () => ({
  default: class {
    accounts = {
      retrieve: async (accountId: string) => ({
        id: accountId,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    }
  },
}))

const { FakeAuthError } = vi.hoisted(() => ({
  FakeAuthError: class FakeAuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: FakeAuthError,
  getTenantForRequest: vi.fn(async () => ({
    userId: 'u1',
    tenantId: roleHolder.tenantId,
    tenant: {
      id: roleHolder.tenantId,
      stripe_api_key: null,
      selena_config: roleHolder.overrides ? { role_permissions: roleHolder.overrides } : null,
    },
    role: roleHolder.role,
  })),
}))

process.env.STRIPE_SECRET_KEY = 'sk_test_env'

import { GET } from './route'

const MEMBER_A = 'member-a'

function req() {
  return new Request(`http://x/api/team-members/${MEMBER_A}/stripe-onboard`)
}

function ctx() {
  return { params: Promise.resolve({ id: MEMBER_A }) }
}

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  roleHolder.overrides = null
  h.store = {
    team_members: [{ id: MEMBER_A, tenant_id: 'tenant-A', stripe_account_id: 'acct_a' }],
  }
})

describe('GET /api/team-members/[id]/stripe-onboard — team.view permission gate', () => {
  it('owner (has team.view) can read Stripe Connect status', async () => {
    const res = await GET(req() as never, ctx())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.connected).toBe(true)
  })

  it("PERMISSION PROBE: staff role loses team.view via role_permissions override -> forbidden", async () => {
    roleHolder.role = 'staff'
    roleHolder.overrides = { staff: { 'team.view': false } }
    const res = await GET(req() as never, ctx())
    expect(res.status).toBe(403)
  })

  it('PERMISSION PROBE: staff role WITH default team.view can still read (default-config control)', async () => {
    roleHolder.role = 'staff'
    roleHolder.overrides = null
    const res = await GET(req() as never, ctx())
    expect(res.status).toBe(200)
  })
})
