import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/dashboard/onboarding/profile — selena_config merge race.
 *
 * BUG (fixed here, same TOCTOU class as the admin/businesses and
 * /api/service-area selena_config fixes): the submit step read
 * tenant.selena_config off a single SELECT, spread the wizard's persona/
 * social fields over it in JS, then folded the merged blob into the SAME
 * blind `tenants` UPDATE as compliance/onboarding_draft/brand columns. This
 * one-time submit racing a team/service-area/persona/permissions save on the
 * same tenant (all of which also patch selena_config) both read the same
 * stale blob, and whichever write lands second silently reverts the other's
 * change with no error to either side.
 *
 * FIX: delegate the selena_config merge to the same atomic Postgres-side
 * `||` (merge_tenant_selena_config) already used elsewhere — no JS-side read
 * feeding the final write, and selena_config is never part of the main
 * blind tenants UPDATE's value set.
 */

const TENANT_A = 'tid-a'

const rpcHolder = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  handler: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
}))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcHolder.calls.push({ fn, args })
      return rpcHolder.handler!(fn, args)
    },
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
}))
vi.mock('@/lib/tenant-profile', () => ({
  normalizeEntityType: (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : null),
}))

import { POST } from './route'

function seed() {
  return {
    tenants: [
      {
        id: TENANT_A,
        // As if a concurrent team/service-area save already landed.
        selena_config: { team_roles: ['worker', 'lead'], service_area: { scope: 'local', states: ['NY'], zones: [] } },
      },
    ] as Record<string, unknown>[],
    entities: [] as Record<string, unknown>[],
  }
}

let h: Harness

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  rpcHolder.calls = []
  // Fake the atomic Postgres `||` merge for real: additive, no JS read-write race.
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    const row = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === args.p_tenant_id)
    if (!row) return { data: null, error: { message: 'not found' } }
    const merged = { ...((row.selena_config as Record<string, unknown>) || {}), ...(args.p_patch as Record<string, unknown>) }
    row.selena_config = merged
    return { data: merged, error: null }
  }
})

function post(body: unknown) {
  return POST(new Request('http://t/api/dashboard/onboarding/profile', { method: 'POST', body: JSON.stringify({ data: body }) }))
}

function storedSelenaConfig(): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)?.selena_config
}

describe('POST /api/dashboard/onboarding/profile — selena_config merge race', () => {
  it('merges persona fields via the atomic RPC, preserving concurrently-saved team_roles and service_area', async () => {
    const res = await post({ businessDescription: 'We clean apartments', googleReviewLink: 'https://g.co/review' })
    expect(res.status).toBe(200)

    expect(storedSelenaConfig()).toEqual({
      team_roles: ['worker', 'lead'],
      service_area: { scope: 'local', states: ['NY'], zones: [] },
      business_description: 'We clean apartments',
      google_review_link: 'https://g.co/review',
    })

    expect(rpcHolder.calls).toEqual([
      {
        fn: 'merge_tenant_selena_config',
        args: {
          p_tenant_id: TENANT_A,
          p_patch: { business_description: 'We clean apartments', google_review_link: 'https://g.co/review' },
        },
      },
    ])
  })

  it('merges social URLs onto the existing social object instead of replacing it', async () => {
    // Seed an existing social key as if a prior submit already set facebook.
    ;(h.seed.tenants as Record<string, unknown>[])[0].selena_config = {
      team_roles: ['worker'],
      social: { facebook: 'https://fb.com/acme' },
    }
    await post({ instagramUrl: 'https://instagram.com/acme' })

    expect(storedSelenaConfig()).toEqual({
      team_roles: ['worker'],
      social: { facebook: 'https://fb.com/acme', instagram: 'https://instagram.com/acme' },
    })
  })

  it('selena_config is never part of the main blind tenants UPDATE (cannot be clobbered by it)', async () => {
    await post({ businessDescription: 'We clean apartments', phone: '555-1234' })
    const tenantsUpdates = h.capture.updates.filter((u) => u.table === 'tenants')
    expect(tenantsUpdates.length).toBeGreaterThan(0)
    for (const u of tenantsUpdates) expect(u.values).not.toHaveProperty('selena_config')
  })

  it('skips the RPC entirely when the submit has no persona/social fields', async () => {
    await post({ phone: '555-1234' })
    expect(rpcHolder.calls).toEqual([])
    // team_roles/service_area from the concurrent save still survive untouched.
    expect(storedSelenaConfig()).toEqual({
      team_roles: ['worker', 'lead'],
      service_area: { scope: 'local', states: ['NY'], zones: [] },
    })
  })
})
