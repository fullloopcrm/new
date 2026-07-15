import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/team-members/[id]/stripe-status called getTenantForRequest() with
 * no requirePermission check at all -- unlike its own POST (team.edit)
 * sibling -- so any authenticated tenant member, incl. a role with team.view
 * revoked via the tenant's own RBAC override, could pull live Stripe Connect
 * onboarding status (charges/payouts enabled, details submitted) for any
 * team member on the tenant. Gated on team.view to match the POST/GET split
 * already used by /api/team/[id].
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('stripe', () => {
  class MockStripe {
    accounts = {
      retrieve: async () => ({ charges_enabled: true, payouts_enabled: true, details_submitted: true, capabilities: {} }),
    }
  }
  return { default: MockStripe }
})

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  DB.tenants = [{ id: TENANT_A, stripe_api_key: null }]
  DB.team_members = [{ id: 'tm-1', tenant_id: TENANT_A, stripe_account_id: 'acct_1' }]
})

import type { NextRequest } from 'next/server'
const getReq = () => new Request('http://x/api/team-members/tm-1/stripe-status') as unknown as NextRequest
const ctx = { params: Promise.resolve({ id: 'tm-1' }) }

describe('GET /api/team-members/[id]/stripe-status — permission gate', () => {
  it('403s a role without team.view', async () => {
    currentRole.value = 'nonexistent-role-with-no-perms'
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(403)
  })

  it('allows staff (has team.view)', async () => {
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ready).toBe(true)
  })
})
