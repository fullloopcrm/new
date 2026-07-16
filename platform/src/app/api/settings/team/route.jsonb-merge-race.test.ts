import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings/team — selena_config merge race.
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id]'s
 * setup_progress/selena_config fix, and the settings/permissions +
 * settings/portal-permissions fixes): the route read tenant.selena_config
 * off a single SELECT, spread team_roles/team_pay_rates/default_working_days
 * over it in JS, then blind-wrote the merged blob back. A team-config save
 * racing a persona/service-area save via admin/businesses PUT (or a second
 * tab's team save) both read the same stale blob — whichever write lands
 * second silently reverts the other's change.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge already used by
 * PUT /api/admin/businesses/[id] and settings/permissions (migrations/
 * 2026_07_16_tenant_jsonb_merge_atomic.sql, merge_tenant_selena_config) — no
 * JS-side read, so nothing to race.
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
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn(), getSettings: vi.fn() }))

import { PUT } from './route'

let selenaConfig: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  selenaConfig = { persona: 'friendly', service_areas: ['10001'] }
  rpcHolder.handler = async (fn, args) => {
    if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    selenaConfig = { ...selenaConfig, ...(args.p_patch as Record<string, unknown>) }
    return { data: selenaConfig, error: null }
  }
})

function put(body: unknown) {
  return PUT(new Request('http://t/api/settings/team', { method: 'PUT', body: JSON.stringify(body) }))
}

describe('PUT /api/settings/team — selena_config merge race', () => {
  it('merges team config via the atomic RPC, preserving concurrently-set selena_config keys', async () => {
    const res = await put({ roles: ['worker', 'lead'], pay_rates: [{ label: 'base', amount: 20 }], default_working_days: [1, 2, 3] })
    expect(res.status).toBe(200)

    // persona + service_areas (as if a concurrent admin/businesses save
    // already landed) both survive untouched.
    expect(selenaConfig.persona).toBe('friendly')
    expect(selenaConfig.service_areas).toEqual(['10001'])
    expect(selenaConfig.team_roles).toEqual(expect.arrayContaining(['worker', 'lead', 'manager']))
    expect(selenaConfig.default_working_days).toEqual([1, 2, 3])

    expect(rpcHolder.calls).toHaveLength(1)
    expect(rpcHolder.calls[0].fn).toBe('merge_tenant_selena_config')
    expect(rpcHolder.calls[0].args.p_tenant_id).toBe(TENANT_ID)
  })

  it('never falls back to a direct tenants-table update (would race a concurrent save)', async () => {
    await put({ roles: ['worker'] })
    expect(rpcHolder.calls.length).toBe(1)
  })
})
