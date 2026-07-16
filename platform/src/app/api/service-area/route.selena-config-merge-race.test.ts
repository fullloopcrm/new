import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/service-area — selena_config merge race.
 *
 * BUG (fixed here, same TOCTOU class as the admin/businesses selena_config
 * fix -- and the exact race migrations/2026_07_16_tenant_jsonb_merge_atomic.sql's
 * own comment already called out as unfixed on this route): the route read
 * tenant.selena_config off a single SELECT, spread the new ServiceArea onto
 * it in JS via withServiceArea(), then blind-wrote the WHOLE merged blob
 * back. A service-area save racing a team/persona/permissions save on the
 * same tenant -- all of which also patch selena_config -- both read the same
 * stale blob, and whichever write lands second silently reverts the other's
 * change with no error to either side.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge already used by
 * PUT /api/admin/businesses/[id] and /api/settings/team (merge_tenant_
 * selena_config) -- no JS-side read, so there's nothing to race.
 */

const TENANT_ID = 'tid-a'

const rpcHolder = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  handler: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcHolder.calls.push({ fn, args })
      return rpcHolder.handler!(fn, args)
    },
    from: () => {
      throw new Error('PUT must not touch the tenants table directly for this merge')
    },
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  getTenantForRequest: vi.fn(),
}))

import { PUT } from './route'

let selenaConfig: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  // As if a concurrent team/persona save already landed on selena_config.
  selenaConfig = { team_roles: ['worker', 'lead'], business_description: 'We clean things' }
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    selenaConfig = { ...selenaConfig, ...(args.p_patch as Record<string, unknown>) }
    return { data: selenaConfig, error: null }
  }
})

function put(body: unknown) {
  return PUT(new Request('http://t/api/service-area', { method: 'PUT', body: JSON.stringify(body) }))
}

describe('PUT /api/service-area — selena_config merge race', () => {
  it('merges service_area via the atomic RPC, preserving a concurrently-saved sibling key', async () => {
    const res = await put({ serviceArea: { scope: 'regional', states: ['NY', 'NJ'], zones: [] } })
    expect(res.status).toBe(200)

    // The sibling keys (as if a concurrent save already landed) survive.
    expect(selenaConfig.team_roles).toEqual(['worker', 'lead'])
    expect(selenaConfig.business_description).toBe('We clean things')
    expect(selenaConfig.service_area).toEqual({ scope: 'regional', states: ['NY', 'NJ'], zones: [] })

    expect(rpcHolder.calls).toEqual([
      {
        fn: 'merge_tenant_selena_config',
        args: { p_tenant_id: TENANT_ID, p_patch: { service_area: { scope: 'regional', states: ['NY', 'NJ'], zones: [] } } },
      },
    ])
  })

  it('never falls back to a direct tenants-table read+update (would race a concurrent save)', async () => {
    await put({ serviceArea: { scope: 'local', states: [], zones: [] } })
    expect(rpcHolder.calls.length).toBe(1)
  })
})
