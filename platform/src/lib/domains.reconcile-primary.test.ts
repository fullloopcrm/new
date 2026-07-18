import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * reconcilePrimaryDomain — the write-side half of the tenant_domains
 * single-primary invariant, extracted so a SECOND write site
 * (activate-tenant.ts's own tenant_domains upsert) can share the same
 * demote-then-set logic already inlined in admin/websites POST.
 *
 * BUG this closes: activate-tenant.ts's domain-routing upsert uses
 * `ignoreDuplicates: true` and is documented as safe to re-run repeatedly.
 * Re-running it after tenant.domain changes (or after a tenant that first
 * activated on the free subdomain later adds a real custom domain) inserts
 * a NEW row flagged is_primary — but ignoreDuplicates means it can never
 * flip is_primary on a row that already existed from a prior run, so the
 * OLD domain stays flagged primary too. getPrimaryTenantDomain()'s
 * oldest-wins tiebreak then keeps resolving to the stale domain forever.
 * Uses the real mutating harness (not domains.test.ts's stateless resolve()
 * mock) because this function's whole job is a two-step mutation
 * (demote-others, then set-one) that a stateless callback can't model.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('./supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { reconcilePrimaryDomain } from './domains'

let h: Harness
function rowsFor(tenantId: string) {
  return (h.seed.tenant_domains as Record<string, unknown>[]).filter((r) => r.tenant_id === tenantId)
}

describe('reconcilePrimaryDomain', () => {
  beforeEach(() => {
    h = createTenantDbHarness({
      tenant_domains: [
        { id: 'td-a-old', tenant_id: TENANT_A, domain: 'old-primary-a.com', active: true, is_primary: true },
        { id: 'td-a-new', tenant_id: TENANT_A, domain: 'new-primary-a.com', active: true, is_primary: false },
        { id: 'td-b-primary', tenant_id: TENANT_B, domain: 'existing-b.com', active: true, is_primary: true },
      ] as Record<string, unknown>[],
    })
    holder.from = h.from
  })

  it('STALE-PRIMARY RECONCILE PROBE: demotes the old primary and promotes the intended one, exactly matching the activate-tenant.ts re-run scenario (upsert leaves the old row untouched)', async () => {
    await reconcilePrimaryDomain(TENANT_A, 'new-primary-a.com')

    const a = rowsFor(TENANT_A)
    const primaries = a.filter((r) => r.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].domain).toBe('new-primary-a.com')
    expect(a.find((r) => r.domain === 'old-primary-a.com')?.is_primary).toBe(false)
  })

  it('WRONG-TENANT PROBE: reconciling one tenant never touches another tenant\'s primary row', async () => {
    await reconcilePrimaryDomain(TENANT_A, 'new-primary-a.com')

    const b = rowsFor(TENANT_B)
    expect(b.find((r) => r.domain === 'existing-b.com')?.is_primary).toBe(true)
  })

  it('is a no-op demote when the intended domain is already the sole primary', async () => {
    await reconcilePrimaryDomain(TENANT_B, 'existing-b.com')

    const b = rowsFor(TENANT_B)
    expect(b.find((r) => r.domain === 'existing-b.com')?.is_primary).toBe(true)
  })

  it('MULTI-STALE-PRIMARY PROBE: demotes ALL other is_primary rows for the tenant, not just one', async () => {
    // Simulates two prior activation runs each leaving their own primary
    // behind (e.g. domain changed twice) before a third run reconciles.
    h.seed.tenant_domains.push({
      id: 'td-a-older',
      tenant_id: TENANT_A,
      domain: 'even-older-primary-a.com',
      active: true,
      is_primary: true,
    })

    await reconcilePrimaryDomain(TENANT_A, 'new-primary-a.com')

    const a = rowsFor(TENANT_A)
    const primaries = a.filter((r) => r.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0].domain).toBe('new-primary-a.com')
  })
})
