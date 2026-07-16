import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings/permissions — role_permissions merge race.
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id]'s
 * setup_progress/selena_config fix): the route read selena_config off
 * `tenant.tenant` (a snapshot captured by this request's requirePermission
 * call), spread `{ role_permissions: cleaned }` over it in JS, then
 * blind-wrote the merged blob back with a plain `tenants` UPDATE. This
 * route's own save racing a portal-permissions save (portal_role_
 * permissions), or a persona/service-area save via admin/businesses, both
 * read the same stale blob -- whichever write lands second silently drops
 * the other's change with no error to either side.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge already used by
 * admin/businesses (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql,
 * merge_tenant_selena_config) -- no JS-side read, so there's nothing to
 * race, and role_permissions is never part of a blind tenants UPDATE.
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
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: TENANT_ID,
      tenant: { id: TENANT_ID, selena_config: { persona: 'friendly', portal_role_permissions: { client: {} } } },
      role: 'owner',
      userId: 'u1',
    },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

let selenaConfig: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  selenaConfig = { persona: 'friendly', portal_role_permissions: { client: {} } }
  // Faithful stand-in for the real Postgres `||` merge -- proves the patch
  // arrives raw (no JS pre-merge) and is additive against whatever else is
  // on the row, exactly like the admin/businesses RPC fake.
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    selenaConfig = { ...selenaConfig, ...(args.p_patch as Record<string, unknown>) }
    return { data: selenaConfig, error: null }
  }
})

function put(overrides: unknown) {
  return PUT(new Request('http://t/api/settings/permissions', { method: 'PUT', body: JSON.stringify({ overrides }) }))
}

describe('PUT /api/settings/permissions — role_permissions merge race', () => {
  it('merges role_permissions via the atomic RPC, preserving concurrently-set selena_config keys', async () => {
    const res = await put({ admin: { 'clients.delete': false } })
    expect(res.status).toBe(200)

    // persona + portal_role_permissions (as if a concurrent portal-permissions
    // save already landed) both survive untouched.
    expect(selenaConfig).toEqual({
      persona: 'friendly',
      portal_role_permissions: { client: {} },
      role_permissions: { admin: { 'clients.delete': false } },
    })

    expect(rpcHolder.calls).toEqual([
      {
        fn: 'merge_tenant_selena_config',
        args: { p_tenant_id: TENANT_ID, p_patch: { role_permissions: { admin: { 'clients.delete': false } } } },
      },
    ])
  })

  it('never falls back to a direct tenants-table update (would race the concurrent save)', async () => {
    await put({ admin: { 'clients.delete': false } })
    // The `from()` mock throws if called -- reaching PUT's return without
    // throwing proves the write went through the RPC exclusively.
    expect(rpcHolder.calls.length).toBe(1)
  })
})
