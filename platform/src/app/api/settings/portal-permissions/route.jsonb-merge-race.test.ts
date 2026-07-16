import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings/portal-permissions — portal_role_permissions merge race.
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id] and
 * PUT /api/settings/permissions): the route read selena_config off
 * `tenant.tenant` (a snapshot from this request's requirePermission call),
 * spread `{ portal_role_permissions: cleaned }` over it in JS, then
 * blind-wrote the merged blob back. A save here racing the dashboard
 * role_permissions save (settings/permissions/route.ts) or a persona/
 * service-area save via admin/businesses -- all on the same selena_config
 * column -- would silently drop whichever write landed first.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge
 * (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql, merge_tenant_selena_config).
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
      tenant: { id: TENANT_ID, selena_config: { persona: 'friendly', role_permissions: { admin: {} } } },
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
  selenaConfig = { persona: 'friendly', role_permissions: { admin: {} } }
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    selenaConfig = { ...selenaConfig, ...(args.p_patch as Record<string, unknown>) }
    return { data: selenaConfig, error: null }
  }
})

function put(overrides: unknown) {
  return PUT(new Request('http://t/api/settings/portal-permissions', { method: 'PUT', body: JSON.stringify({ overrides }) }))
}

describe('PUT /api/settings/portal-permissions — portal_role_permissions merge race', () => {
  it('merges portal_role_permissions via the atomic RPC, preserving concurrently-set selena_config keys', async () => {
    const res = await put({ lead: { 'jobs.reassign': false } })
    expect(res.status).toBe(200)

    // persona + role_permissions (as if the dashboard permissions save
    // already landed concurrently) both survive untouched.
    expect(selenaConfig).toEqual({
      persona: 'friendly',
      role_permissions: { admin: {} },
      portal_role_permissions: { lead: { 'jobs.reassign': false } },
    })

    expect(rpcHolder.calls).toEqual([
      {
        fn: 'merge_tenant_selena_config',
        args: { p_tenant_id: TENANT_ID, p_patch: { portal_role_permissions: { lead: { 'jobs.reassign': false } } } },
      },
    ])
  })

  it('never falls back to a direct tenants-table update (would race the concurrent save)', async () => {
    await put({ lead: { 'jobs.reassign': false } })
    expect(rpcHolder.calls.length).toBe(1)
  })
})
