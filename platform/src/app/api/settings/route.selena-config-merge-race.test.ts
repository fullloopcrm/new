import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/settings — selena_config merge race.
 *
 * BUG (fixed here, same TOCTOU class as the admin/businesses fix at
 * migrations/2026_07_16_tenant_jsonb_merge_atomic.sql): this route folded
 * body.selena_config directly into the blind `tenants` UPDATE alongside
 * every other settings field — a full-column replace with whatever object
 * the caller sent. The dashboard's Selena tab (saveSelenaConfig() in
 * dashboard/settings/page.tsx) round-trips the WHOLE selena_config object it
 * loaded at page-open time. Two concurrent writers to the SAME tenant's
 * selena_config — the admin backend's service_areas edit (PUT
 * /api/admin/businesses/[id], already fixed for the identical reason) and a
 * dashboard tab saving an unrelated Selena section (tone, pricing_rows,
 * escalation_phone, ...) — both hold their own stale/partial snapshot, and
 * whichever save lands second silently wipes whatever key the other one had
 * just written, with no error to either side.
 *
 * FIX: route selena_config through the SAME atomic Postgres-side `||` RPC
 * (merge_tenant_selena_config) the admin/businesses fix already introduced,
 * instead of folding it into the blind tenants UPDATE. selena_config is
 * never part of that UPDATE's value set anymore, so there's no window left
 * to race. Handles the dashboard's real request shape — a PUT containing
 * ONLY { selena_config } — without calling the main UPDATE with an empty
 * payload (rejected elsewhere in this codebase; see jobs/[id]/route.ts's own
 * "Nothing to update" guard).
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({
  tenantRow: null as null | Record<string, unknown>,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              holder.updateCalls.push({ table, values })
              if (table === 'tenants') {
                holder.tenantRow = { ...(holder.tenantRow || {}), ...values }
                return { data: { ...holder.tenantRow }, error: null }
              }
              return { data: null, error: null }
            },
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          single: async () => ({ data: table === 'tenants' ? { ...holder.tenantRow } : null, error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      holder.rpcCalls.push({ fn, args })
      if (fn !== 'merge_tenant_selena_config') return { data: null, error: { message: 'unknown fn' } }
      const merged = { ...((holder.tenantRow?.selena_config as Record<string, unknown>) || {}), ...(args.p_patch as Record<string, unknown>) }
      holder.tenantRow = { ...(holder.tenantRow || {}), selena_config: merged }
      return { data: merged, error: null }
    },
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_A }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn(async () => {}) }))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/selena-legacy', () => ({ clearSelenaConfigCache: vi.fn() }))

import { PUT } from './route'

beforeEach(() => {
  holder.tenantRow = {
    id: TENANT_A, name: 'Acme', business_hours: '9-5',
    selena_config: { persona: 'friendly', service_areas: ['old-town'] },
  }
  holder.rpcCalls = []
  holder.updateCalls = []
})

function put(body: unknown) {
  return PUT(new Request('http://t/api/settings', { method: 'PUT', body: JSON.stringify(body) }))
}

describe('PUT /api/settings — selena_config merge race', () => {
  it('a selena_config-only save (the dashboard Selena tab\'s real request shape) merges via the atomic RPC, not a blind replace', async () => {
    const res = await put({ selena_config: { tone: 'casual' } })
    expect(res.status).toBe(200)

    // Additive: a concurrently-written key (service_areas, seeded as if the
    // admin backend already saved it) survives untouched.
    expect(holder.tenantRow?.selena_config).toEqual({ persona: 'friendly', service_areas: ['old-town'], tone: 'casual' })

    // The RPC receives the RAW patch the caller sent, not a JS-merged blob —
    // proving no stale snapshot was read and re-merged client-side.
    expect(holder.rpcCalls).toEqual([
      { fn: 'merge_tenant_selena_config', args: { p_tenant_id: TENANT_A, p_patch: { tone: 'casual' } } },
    ])

    // The main tenants UPDATE is never called with an empty payload for a
    // selena_config-only request.
    expect(holder.updateCalls.filter((u) => u.table === 'tenants')).toEqual([])
  })

  it('selena_config is never part of the main blind tenants UPDATE when other fields are also saved', async () => {
    await put({ business_hours: '8-6', selena_config: { tone: 'casual' } })
    const tenantUpdates = holder.updateCalls.filter((u) => u.table === 'tenants')
    expect(tenantUpdates.length).toBe(1)
    expect(tenantUpdates[0].values).not.toHaveProperty('selena_config')
    expect(tenantUpdates[0].values).toEqual({ business_hours: '8-6' })
  })

  it('a plain settings save with no selena_config in the request never touches selena_config at all', async () => {
    const res = await put({ business_hours: '8-6' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls).toEqual([])
    expect(holder.tenantRow?.selena_config).toEqual({ persona: 'friendly', service_areas: ['old-town'] })
  })

  it('CONCURRENCY PROBE: two different Selena-section saves for the same tenant both survive regardless of order', async () => {
    // Simulates two dashboard tabs saving different Selena sections back to
    // back — each PUT only carries the section it edited, exactly like
    // saveSelenaConfig() does today.
    await put({ selena_config: { tone: 'casual' } })
    await put({ selena_config: { pricing_rows: [{ label: 'base', cents: 6900 }] } })

    expect(holder.tenantRow?.selena_config).toEqual({
      persona: 'friendly', service_areas: ['old-town'], tone: 'casual',
      pricing_rows: [{ label: 'base', cents: 6900 }],
    })
  })
})
