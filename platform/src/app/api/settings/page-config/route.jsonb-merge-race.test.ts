import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings/page-config — setup_progress merge race.
 *
 * BUG (fixed here, same TOCTOU class as the admin/businesses setup_progress
 * fix): the route read tenant.setup_progress off a single SELECT, set one
 * `__page_config_<page>` key on it in JS, then blind-wrote the WHOLE merged
 * blob back. Two different admin pages saving their per-page config
 * concurrently (or a page-config save racing an onboarding-checklist toggle
 * on the same setup_progress column) both read the same stale blob —
 * whichever write lands second silently drops the other page's just-saved
 * config key.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge already used by
 * PUT /api/admin/businesses/[id] (migrations/2026_07_16_tenant_jsonb_merge_
 * atomic.sql, merge_tenant_setup_progress) — no JS-side read, so nothing to
 * race.
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

let setupProgress: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  // As if a concurrent save from the "bookings" page config already landed.
  setupProgress = { __page_config_bookings: { sort: 'date' } }
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_setup_progress') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    setupProgress = { ...setupProgress, ...(args.p_patch as Record<string, unknown>) }
    return { data: setupProgress, error: null }
  }
})

function put(body: unknown) {
  return PUT(new Request('http://t/api/settings/page-config', { method: 'PUT', body: JSON.stringify(body) }))
}

describe('PUT /api/settings/page-config — setup_progress merge race', () => {
  it("merges this page's config key via the atomic RPC, preserving a concurrently-saved sibling page's key", async () => {
    const res = await put({ page: 'clients', config: { columns: ['name', 'phone'] } })
    expect(res.status).toBe(200)

    // The sibling page's config (as if a concurrent save already landed) survives.
    expect(setupProgress.__page_config_bookings).toEqual({ sort: 'date' })
    expect(setupProgress.__page_config_clients).toEqual({ columns: ['name', 'phone'] })

    expect(rpcHolder.calls).toEqual([
      {
        fn: 'merge_tenant_setup_progress',
        args: { p_tenant_id: TENANT_ID, p_patch: { __page_config_clients: { columns: ['name', 'phone'] } } },
      },
    ])
  })

  it('never falls back to a direct tenants-table update (would race a concurrent save)', async () => {
    await put({ page: 'clients', config: { columns: ['name'] } })
    expect(rpcHolder.calls.length).toBe(1)
  })
})
