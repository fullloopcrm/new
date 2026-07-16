import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/businesses/[id]/verify-checklist — setup_progress merge race.
 *
 * BUG (fixed here, same TOCTOU class as PUT /api/admin/businesses/[id]'s
 * setup_progress/selena_config fix — this route was missed in that sweep):
 * the route read tenant.setup_progress off a single SELECT, spread the fresh
 * check results over it in JS, then blind-wrote the merged blob back
 * alongside dns_configured. A live verify run racing a manual onboarding
 * checkbox toggle on PUT /api/admin/businesses/[id] (or a second concurrent
 * verify run) both read the same stale setup_progress blob — whichever
 * write lands second silently reverts the other's change.
 *
 * FIX: delegate to the same atomic Postgres-side `||` merge already used by
 * PUT /api/admin/businesses/[id] (migrations/2026_07_16_tenant_jsonb_merge_
 * atomic.sql, merge_tenant_setup_progress) — no JS-side read, so nothing to
 * race. dns_configured (a plain scalar, not merged) stays a normal update.
 */

const TENANT_ID = 'tid-a'

const supabaseHolder = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcHandler: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: TENANT_ID,
              domain: 'acme.com',
              resend_api_key: null,
              resend_domain: null,
              telnyx_api_key: null,
              telnyx_phone: null,
              stripe_api_key: null,
              stripe_account_id: null,
              setup_progress: { manual_step_done: true },
            },
            error: null,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => {
        supabaseHolder.updateCalls.push({ table, values })
        return { eq: async () => ({ data: null, error: null }) }
      },
    }),
    rpc: (fn: string, args: Record<string, unknown>) => {
      supabaseHolder.rpcCalls.push({ fn, args })
      return supabaseHolder.rpcHandler!(fn, args)
    },
  },
}))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/onboarding-verify', () => ({
  runAllChecks: vi.fn(async () => ({
    dns_a: { ok: true }, dns_cname_www: { ok: true }, mx_records: { ok: false },
    ssl_active: { ok: true }, resend_domain_verified: { ok: false },
    telnyx_number_active: { ok: false }, stripe_webhook_configured: { ok: false },
    stripe_account: { ok: false },
  })),
}))

import { POST } from './route'

let setupProgress: Record<string, unknown>

beforeEach(() => {
  supabaseHolder.rpcCalls = []
  supabaseHolder.updateCalls = []
  setupProgress = { manual_step_done: true }
  supabaseHolder.rpcHandler = async (fn, args) => {
    if (fn !== 'merge_tenant_setup_progress') return { data: null, error: { message: `unexpected rpc ${fn}` } }
    setupProgress = { ...setupProgress, ...(args.p_patch as Record<string, unknown>) }
    return { data: setupProgress, error: null }
  }
})

function post(id: string) {
  return POST(new Request(`http://t/api/admin/businesses/${id}/verify-checklist`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  })
}

describe('POST /api/admin/businesses/[id]/verify-checklist — setup_progress merge race', () => {
  it('merges check results via the atomic RPC, preserving a concurrently-set manual checkbox', async () => {
    const res = await post(TENANT_ID)
    expect(res.status).toBe(200)

    // manual_step_done (as if a concurrent admin.businesses PUT already
    // landed) survives untouched, alongside the fresh check results.
    expect(setupProgress.manual_step_done).toBe(true)
    expect(setupProgress.dns_a_record).toBe(true)
    expect(setupProgress.ssl_active).toBe(true)
    expect(setupProgress.mx_records).toBe(false)

    expect(supabaseHolder.rpcCalls).toHaveLength(1)
    expect(supabaseHolder.rpcCalls[0].fn).toBe('merge_tenant_setup_progress')
    expect(supabaseHolder.rpcCalls[0].args.p_tenant_id).toBe(TENANT_ID)
  })

  it('dns_configured is written as a plain scalar update, never folded into the jsonb patch', async () => {
    await post(TENANT_ID)
    const dnsUpdate = supabaseHolder.updateCalls.find((c) => 'dns_configured' in c.values)
    expect(dnsUpdate).toBeDefined()
    expect(dnsUpdate!.values.dns_configured).toBe(true)
    // The RPC patch itself never carries dns_configured.
    expect(supabaseHolder.rpcCalls[0].args.p_patch).not.toHaveProperty('dns_configured')
  })

  it('never folds setup_progress into a direct tenants-table update (would race a concurrent save)', async () => {
    await post(TENANT_ID)
    const spUpdate = supabaseHolder.updateCalls.find((c) => 'setup_progress' in c.values)
    expect(spUpdate).toBeUndefined()
  })
})
