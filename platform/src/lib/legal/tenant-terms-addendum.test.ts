import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation for the per-tenant Terms of Service addendum (P6). The
 * /terms marketing page renders this alongside the base platform terms when
 * the current request resolves to a specific tenant -- a leak here would mean
 * one partner's negotiated pricing/clauses rendering on another partner's
 * session. Wrong-tenant probe: seed addenda for two tenants and confirm each
 * lookup returns only its own tenant's row, never the other's.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { getTenantTermsAddendum } from './tenant-terms-addendum'

function seed() {
  return {
    tenant_terms_addenda: [
      {
        id: 'addendum-a',
        tenant_id: A,
        active: true,
        effective_date: '2026-01-01',
        monthly_rate_override: 1800,
        setup_fee_override: 15000,
        custom_clauses: 'Tenant A gets a 90-day trial.',
        notes: 'negotiated by sales',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'addendum-b',
        tenant_id: B,
        active: true,
        effective_date: '2026-02-01',
        monthly_rate_override: 2200,
        setup_fee_override: null,
        custom_clauses: 'Tenant B custom SLA clause.',
        notes: null,
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'addendum-a-inactive',
        tenant_id: A,
        active: false,
        effective_date: '2025-06-01',
        monthly_rate_override: 999,
        setup_fee_override: null,
        custom_clauses: 'Superseded terms -- must never render.',
        notes: null,
        created_at: '2025-06-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('getTenantTermsAddendum — tenant isolation', () => {
  it("returns tenant A's own addendum, never tenant B's", async () => {
    const result = await getTenantTermsAddendum(A)
    expect(result?.id).toBe('addendum-a')
    expect(result?.custom_clauses).toBe('Tenant A gets a 90-day trial.')
  })

  it("returns tenant B's own addendum, never tenant A's", async () => {
    const result = await getTenantTermsAddendum(B)
    expect(result?.id).toBe('addendum-b')
    expect(result?.custom_clauses).toBe('Tenant B custom SLA clause.')
  })

  it('never returns an inactive (superseded) addendum', async () => {
    const result = await getTenantTermsAddendum(A)
    expect(result?.id).not.toBe('addendum-a-inactive')
  })

  it('returns null for a tenant with no addendum on file', async () => {
    const result = await getTenantTermsAddendum('tid-no-addendum')
    expect(result).toBeNull()
  })

  it('returns null for an empty tenantId instead of querying', async () => {
    const result = await getTenantTermsAddendum('')
    expect(result).toBeNull()
  })

  it('fails open to null when the query errors (e.g. table not yet migrated)', async () => {
    holder.from = () => {
      throw new Error('relation "tenant_terms_addenda" does not exist')
    }
    const result = await getTenantTermsAddendum(A)
    expect(result).toBeNull()
  })
})
