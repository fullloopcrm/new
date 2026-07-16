import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/setup-checklist — setup_progress merge race (complete_key /
 * uncomplete_key).
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id]'s
 * setup_progress fix): both branches read `tenant.setup_progress` (a
 * snapshot from this request's getTenantForRequest call), spread the one
 * changed key over it (or deleted a key) in JS, then blind-wrote the merged
 * object back with a plain `tenants` UPDATE. Two checklist items checked (or
 * unchecked) via near-simultaneous requests -- e.g. two open dashboard tabs,
 * or this operator-facing checklist racing an admin's onboarding-checklist
 * save via admin/businesses -- both read the same stale blob, and whichever
 * write lands second silently reverts the other's checked box.
 *
 * FIX: complete_key merges via the same atomic Postgres-side `||`
 * (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql,
 * merge_tenant_setup_progress) already used by admin/businesses.
 * uncomplete_key needs to REMOVE a key, which `||` can't do, so it uses a
 * new sibling RPC (remove_tenant_setup_progress_key, jsonb `-` operator) --
 * still atomic, still no JS-side read.
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
      throw new Error('POST must not touch the tenants table directly for setup_progress writes')
    },
  },
}))

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
      tenantId: TENANT_ID,
      tenant: { id: TENANT_ID, setup_progress: { gmail_created: true } },
      role: 'owner',
    })),
  }
})

import { POST } from './route'

let setupProgress: Record<string, unknown>

beforeEach(() => {
  rpcHolder.calls = []
  setupProgress = { gmail_created: true }
  rpcHolder.handler = async (fn, args) => {
    if (fn === 'merge_tenant_setup_progress') {
      setupProgress = { ...setupProgress, ...(args.p_patch as Record<string, unknown>) }
      return { data: setupProgress, error: null }
    }
    if (fn === 'remove_tenant_setup_progress_key') {
      const next = { ...setupProgress }
      delete next[args.p_key as string]
      setupProgress = next
      return { data: setupProgress, error: null }
    }
    return { data: null, error: { message: `unexpected rpc ${fn}` } }
  }
})

function post(body: unknown) {
  return POST(new Request('http://t/api/setup-checklist', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/setup-checklist — complete_key merge race', () => {
  it('merges the completed key via the atomic RPC, preserving a concurrently-set key', async () => {
    const res = await post({ complete_key: 'reviewed_services' })
    expect(res.status).toBe(200)

    expect(setupProgress).toEqual({ gmail_created: true, reviewed_services: true })
    expect(rpcHolder.calls).toEqual([
      { fn: 'merge_tenant_setup_progress', args: { p_tenant_id: TENANT_ID, p_patch: { reviewed_services: true } } },
    ])
  })
})

describe('POST /api/setup-checklist — uncomplete_key removal race', () => {
  it('removes only the target key via the atomic RPC, preserving the rest of the blob', async () => {
    setupProgress = { gmail_created: true, reviewed_services: true }
    const res = await post({ uncomplete_key: 'reviewed_services' })
    expect(res.status).toBe(200)

    expect(setupProgress).toEqual({ gmail_created: true })
    expect(rpcHolder.calls).toEqual([
      { fn: 'remove_tenant_setup_progress_key', args: { p_tenant_id: TENANT_ID, p_key: 'reviewed_services' } },
    ])
  })

  it('never falls back to a direct tenants-table update (would race a concurrent checklist save)', async () => {
    await post({ complete_key: 'reviewed_services' })
    await post({ uncomplete_key: 'gmail_created' })
    expect(rpcHolder.calls.length).toBe(2)
  })
})
