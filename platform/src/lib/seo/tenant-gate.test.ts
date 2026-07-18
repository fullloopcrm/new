import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-gate.ts's nonServingTenantIds() -- the shared filter every seo-*
 * pipeline stage (technical/competitor scans, proposal/enrichment drafting,
 * autopilot apply, ingest) uses to stop spending GSC/SERP/Anthropic budget
 * and stop writing live-site overrides for a suspended/cancelled/deleted
 * tenant whose seo_properties/seo_issues/seo_changes rows outlive their status.
 */

type TenantRow = { id: string; status: string | null }

let tenantRows: TenantRow[]

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => {
        if (table === 'tenants') return Promise.resolve({ data: tenantRows, error: null })
        return Promise.resolve({ data: [], error: null })
      },
    }),
  },
}))

import { nonServingTenantIds } from './tenant-gate'

beforeEach(() => {
  tenantRows = []
})

describe('nonServingTenantIds()', () => {
  it('includes suspended, cancelled, and deleted tenants', async () => {
    tenantRows = [
      { id: 't-susp', status: 'suspended' },
      { id: 't-cancel', status: 'cancelled' },
      { id: 't-del', status: 'deleted' },
    ]

    const ids = await nonServingTenantIds()

    expect(ids.has('t-susp')).toBe(true)
    expect(ids.has('t-cancel')).toBe(true)
    expect(ids.has('t-del')).toBe(true)
  })

  it('excludes active, setup, and pending tenants (new tenants are servable before full activation)', async () => {
    tenantRows = [
      { id: 't-active', status: 'active' },
      { id: 't-setup', status: 'setup' },
      { id: 't-pending', status: 'pending' },
    ]

    const ids = await nonServingTenantIds()

    expect(ids.size).toBe(0)
  })

  it('wrong-tenant probe: one non-serving tenant never pulls in an unrelated serving tenant', async () => {
    tenantRows = [
      { id: 't-dead', status: 'cancelled' },
      { id: 't-live', status: 'active' },
    ]

    const ids = await nonServingTenantIds()

    expect(ids.has('t-dead')).toBe(true)
    expect(ids.has('t-live')).toBe(false)
  })
})
