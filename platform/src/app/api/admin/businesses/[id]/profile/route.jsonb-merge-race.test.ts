import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PATCH /api/admin/businesses/[id]/profile — selena_config / compliance merge race.
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id]'s
 * setup_progress/selena_config fix, and the settings/permissions +
 * settings/portal-permissions fixes): this is the CANONICAL one-form
 * live-save profile UI — routeProfileWrite() fires a fresh PATCH per field
 * edit. The jsonb branch read selena_config/compliance off a single SELECT,
 * spread the incoming field(s) over it in JS, then blind-wrote the merged
 * blob back. Two fields in the SAME jsonb store saved back-to-back (the live
 * form debounces per-field, so this is routine, not rare), or two admins
 * editing the same tenant's profile in separate tabs, both read the same
 * stale blob — whichever write lands second silently reverts the sibling
 * field the first write just saved.
 *
 * FIX: delegate to atomic Postgres-side `||` merges (migrations/2026_07_16_
 * tenant_jsonb_merge_atomic.sql) — merge_tenant_selena_config (existing) and
 * the new merge_tenant_compliance RPC. No JS-side read, so nothing to race,
 * and neither jsonb column is ever part of a blind tenants UPDATE.
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
      throw new Error('PATCH must not touch the tenants table directly for a jsonb-only patch')
    },
  },
}))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant-readiness', () => ({ computeReadiness: vi.fn(async () => ({ score: 1 })) }))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/entity-provision', () => ({ ensureDefaultEntity: vi.fn(async () => true) }))
vi.mock('@/lib/secret-crypto', () => ({ encryptTenantSecrets: (x: Record<string, unknown>) => x }))

import { PATCH } from './route'

let selenaConfig: Record<string, unknown>
let compliance: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  selenaConfig = { persona: 'friendly', tone: 'casual' }
  compliance = { license_state: 'NY' }
  // Faithful stand-in for the real Postgres `||` merge on each column.
  rpcHolder.handler = async (fn, args) => {
    if (fn === 'merge_tenant_selena_config') {
      selenaConfig = { ...selenaConfig, ...(args.p_patch as Record<string, unknown>) }
      return { data: selenaConfig, error: null }
    }
    if (fn === 'merge_tenant_compliance') {
      compliance = { ...compliance, ...(args.p_patch as Record<string, unknown>) }
      return { data: compliance, error: null }
    }
    return { data: null, error: { message: `unexpected rpc ${fn}` } }
  }
})

function patch(id: string, body: unknown) {
  return PATCH(new Request(`http://t/api/admin/businesses/${id}/profile`, { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

describe('PATCH /api/admin/businesses/[id]/profile — jsonb merge race', () => {
  it('merges a selena field via the atomic RPC, preserving concurrently-set sibling keys', async () => {
    const res = await patch(TENANT_ID, { field: 'aiName', value: 'Yinez' })
    expect(res.status).toBe(200)

    // persona + tone (as if a concurrent save already landed) both survive.
    expect(selenaConfig).toEqual({ persona: 'friendly', tone: 'casual', ai_name: 'Yinez' })
    expect(rpcHolder.calls).toEqual([
      { fn: 'merge_tenant_selena_config', args: { p_tenant_id: TENANT_ID, p_patch: { ai_name: 'Yinez' } } },
    ])
  })

  it('merges a compliance field via the atomic RPC, preserving concurrently-set sibling keys', async () => {
    const res = await patch(TENANT_ID, { field: 'license', value: 'LIC-99' })
    expect(res.status).toBe(200)

    expect(compliance).toEqual({ license_state: 'NY', license_number: 'LIC-99' })
    expect(rpcHolder.calls).toEqual([
      { fn: 'merge_tenant_compliance', args: { p_tenant_id: TENANT_ID, p_patch: { license_number: 'LIC-99' } } },
    ])
  })

  it('a single multi-field save merges BOTH jsonb stores independently, no cross-clobber', async () => {
    const res = await patch(TENANT_ID, { values: { aiName: 'Yinez', license: 'LIC-99' } })
    expect(res.status).toBe(200)

    expect(selenaConfig.ai_name).toBe('Yinez')
    expect(compliance.license_number).toBe('LIC-99')
    expect(rpcHolder.calls.map((c) => c.fn).sort()).toEqual(['merge_tenant_compliance', 'merge_tenant_selena_config'])
  })

  it('never falls back to a direct tenants-table update for a jsonb-only patch (would race a concurrent save)', async () => {
    await patch(TENANT_ID, { field: 'aiName', value: 'Yinez' })
    // The `from()` mock throws if called — reaching PATCH's return without
    // throwing proves the write went through the RPC exclusively.
    expect(rpcHolder.calls.length).toBe(1)
  })
})
