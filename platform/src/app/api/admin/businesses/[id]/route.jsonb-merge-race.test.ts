import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/admin/businesses/[id] — setup_progress / selena_config merge race.
 *
 * BUG (fixed here, same TOCTOU class as the invoice/quote/booking edit-route
 * fixes): both fields used a read-merge-write — read the current jsonb blob,
 * spread the caller's partial patch over it in JS, then hand the merged
 * result to the SAME blind `tenants` UPDATE as every other field on this
 * route. Two concurrent saves for the SAME tenant (one admin checking off
 * "domain_added_vercel" on the onboarding checklist while another checks off
 * "dns_a_record" in a second tab; or a service-area save racing a
 * persona/pricing save on selena_config) both read the same stale blob, and
 * whichever write lands second silently reverts the first admin's change —
 * no error to either side.
 *
 * FIX: delegate the merge to an atomic Postgres-side `||` in
 * migrations/2026_07_16_tenant_jsonb_merge_atomic.sql (merge_tenant_setup_progress
 * / merge_tenant_selena_config) — no JS-side read step, so there is nothing
 * left to race, and neither key is ever included in the main blind
 * `tenants` UPDATE's value set.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  rpc: null as null | ((fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args),
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { PUT } from './route'

function seed() {
  return {
    tenants: [
      {
        id: TENANT_A, slug: 'acme', name: 'Acme', admin_seats: 1, team_seats: 0,
        setup_progress: { gmail_created: true },
        selena_config: { persona: 'friendly', service_areas: ['old-town'] },
      },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
let rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  rpcCalls = []
  // Fake the atomic Postgres `||` merge for real: prove the merge is
  // additive (old keys survive) exactly like the real RPC, without ever
  // routing through the JS-side read-then-write this fix removed.
  holder.rpc = async (fn, args) => {
    rpcCalls.push({ fn, args })
    const row = (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === args.p_tenant_id)
    if (!row) return { data: null, error: { message: 'not found' } }
    const field = fn === 'merge_tenant_setup_progress' ? 'setup_progress' : 'selena_config'
    const merged = { ...((row[field] as Record<string, unknown>) || {}), ...(args.p_patch as Record<string, unknown>) }
    row[field] = merged
    return { data: merged, error: null }
  }
})

function put(body: unknown) {
  return PUT(
    new Request('http://t/api/admin/businesses/' + TENANT_A, { method: 'PUT', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: TENANT_A }) },
  )
}

function stored(field: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.id === TENANT_A)?.[field]
}

describe('PUT /api/admin/businesses/[id] — setup_progress merge race', () => {
  it('merges the new checklist step in via the atomic RPC, not a JS read-merge-write', async () => {
    const res = await put({ setup_progress: { domain_purchased: true } })
    expect(res.status).toBe(200)

    // Additive: a concurrently-checked box (gmail_created, seeded as if
    // another admin already saved it) survives untouched.
    expect(stored('setup_progress')).toEqual({ gmail_created: true, domain_purchased: true })

    // The RPC receives the RAW, un-merged patch — proving no JS-side read
    // of the current blob happens at all, so there's no stale snapshot to
    // race against.
    expect(rpcCalls).toEqual([
      { fn: 'merge_tenant_setup_progress', args: { p_tenant_id: TENANT_A, p_patch: { domain_purchased: true } } },
    ])
  })

  it('setup_progress is never part of the main blind tenants UPDATE (cannot be clobbered by it)', async () => {
    await put({ setup_progress: { domain_purchased: true }, admin_notes: 'checked in' })
    const tenantsUpdates = h.capture.updates.filter((u) => u.table === 'tenants')
    expect(tenantsUpdates.length).toBeGreaterThan(0)
    for (const u of tenantsUpdates) expect(u.values).not.toHaveProperty('setup_progress')
  })
})

describe('PUT /api/admin/businesses/[id] — selena_config / service_areas merge race', () => {
  it('service_areas alone merges via the atomic RPC, preserving the rest of the blob', async () => {
    const res = await put({ service_areas: ['Uptown', ' Midtown ', ''] })
    expect(res.status).toBe(200)

    expect(stored('selena_config')).toEqual({ persona: 'friendly', service_areas: ['Uptown', 'Midtown'] })
    expect(rpcCalls).toEqual([
      { fn: 'merge_tenant_selena_config', args: { p_tenant_id: TENANT_A, p_patch: { service_areas: ['Uptown', 'Midtown'] } } },
    ])
  })

  it('service_areas alone never puts selena_config in the main blind tenants UPDATE', async () => {
    await put({ service_areas: ['Uptown'] })
    const tenantsUpdates = h.capture.updates.filter((u) => u.table === 'tenants')
    expect(tenantsUpdates.length).toBeGreaterThan(0)
    for (const u of tenantsUpdates) expect(u.values).not.toHaveProperty('selena_config')
  })

  it('sending the full selena_config blob alongside service_areas still takes the direct-replace path (no RPC, no regression)', async () => {
    const res = await put({ selena_config: { persona: 'bold' }, service_areas: ['Downtown'] })
    expect(res.status).toBe(200)
    expect(stored('selena_config')).toEqual({ persona: 'bold', service_areas: ['Downtown'] })
    expect(rpcCalls).toEqual([])
  })
})
