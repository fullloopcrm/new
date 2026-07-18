import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * autopilot.ts's runAutopilot() — the ONLY seo-* pipeline stage that writes
 * directly to a tenant's LIVE site (seo_overrides, read by generateMetadata).
 * Before this fix it read seo_changes and applied Tier-1 title/meta overrides
 * with zero tenant-status check: a suspended/cancelled/deleted tenant's site
 * kept getting its live title/meta silently rewritten forever. Mocks
 * supabaseAdmin against tenants/seo_changes/seo_competitors/seo_overrides,
 * mirroring backlinks.test.ts's inline chain-builder pattern.
 */

type ChangeRow = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string
  field: 'title' | 'meta_description'
  before_value: string | null
  after_value: string | null
  tier: number
  status: string
  applied_by?: string
  applied_at?: string
  proposed_at?: string
}
type TenantRow = { id: string; status: string | null }

let changeRows: ChangeRow[]
let tenantRows: TenantRow[]
let overrideUpserts: Array<Record<string, unknown>>

function matches(row: Record<string, unknown>, eq: Record<string, unknown>): boolean {
  return Object.entries(eq).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  let mode: 'select' | 'update' | 'upsert' = 'select'
  const eq: Record<string, unknown> = {}
  let inFilter: { col: string; vals: unknown[] } | undefined
  let gteFilter: { col: string; val: unknown } | undefined
  let countMode = false
  let updatePayload: Record<string, unknown> | undefined

  const chain = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      mode = 'select'
      if (opts?.count) countMode = true
      return chain
    },
    update: (payload: Record<string, unknown>) => {
      mode = 'update'
      updatePayload = payload
      return chain
    },
    upsert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === 'seo_overrides') {
        overrideUpserts.push(...(Array.isArray(payload) ? payload : [payload]))
      }
      return Promise.resolve({ data: null, error: null })
    },
    eq: (col: string, val: unknown) => {
      eq[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      inFilter = { col, vals }
      return chain
    },
    gte: (col: string, val: unknown) => {
      gteFilter = { col, val }
      return chain
    },
    order: () => chain,
    limit: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown; count?: number }) => void) => {
      if (table === 'tenants') {
        resolve({ data: tenantRows, error: null })
        return
      }
      if (table === 'seo_competitors') {
        resolve({ data: [], error: null })
        return
      }
      if (table === 'seo_changes') {
        if (mode === 'update') {
          const ids = inFilter?.col === 'id' ? inFilter.vals : []
          changeRows = changeRows.map((r) => (ids.includes(r.id) ? { ...r, ...updatePayload } : r))
          resolve({ data: null, error: null })
          return
        }
        let rows: ChangeRow[] = changeRows.filter((r) => matches(r as unknown as Record<string, unknown>, eq))
        if (inFilter) rows = rows.filter((r) => inFilter!.vals.includes((r as unknown as Record<string, unknown>)[inFilter!.col]))
        if (gteFilter) rows = rows.filter((r) => String((r as unknown as Record<string, unknown>)[gteFilter!.col] ?? '') >= String(gteFilter!.val))
        if (countMode) {
          resolve({ data: null, error: null, count: rows.length })
          return
        }
        resolve({ data: rows, error: null })
        return
      }
      resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { runAutopilot } from './autopilot'

const SAFE_TITLE = { before: 'Old Title', after: 'Emergency Cleaning Services Today' }
const SAFE_META = {
  before: 'Old meta description here for the page in question today.',
  after: 'Reliable emergency cleaning services available today for your home or business needs.',
}

function changeFor(tenantId: string | null, property: string, url: string, idPrefix: string): ChangeRow[] {
  return [
    {
      id: `${idPrefix}-title`,
      property,
      tenant_id: tenantId,
      target_url: url,
      field: 'title',
      before_value: SAFE_TITLE.before,
      after_value: SAFE_TITLE.after,
      tier: 1,
      status: 'proposed',
      proposed_at: '2026-01-01T00:00:00Z',
    },
    {
      id: `${idPrefix}-meta`,
      property,
      tenant_id: tenantId,
      target_url: url,
      field: 'meta_description',
      before_value: SAFE_META.before,
      after_value: SAFE_META.after,
      tier: 1,
      status: 'proposed',
      proposed_at: '2026-01-01T00:00:00Z',
    },
  ]
}

beforeEach(() => {
  changeRows = []
  tenantRows = []
  overrideUpserts = []
  process.env.SEO_AUTOPILOT_ENABLED = 'true'
})

afterEach(() => {
  delete process.env.SEO_AUTOPILOT_ENABLED
})

describe('runAutopilot()', () => {
  it('is a no-op when SEO_AUTOPILOT_ENABLED is not "true"', async () => {
    delete process.env.SEO_AUTOPILOT_ENABLED
    changeRows = changeFor('t-active', 'sc-domain:example.com', 'https://example.com/emergency-cleaning', 'c1')
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await runAutopilot()

    expect(result.enabled).toBe(false)
    expect(result.applied).toBe(0)
    expect(overrideUpserts).toHaveLength(0)
  })

  it('applies a proposed change for a still-serving (active) tenant', async () => {
    changeRows = changeFor('t-active', 'sc-domain:example.com', 'https://example.com/emergency-cleaning', 'c1')
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
    expect(overrideUpserts).toHaveLength(1)
    expect(overrideUpserts[0].url).toBe('https://example.com/emergency-cleaning')
  })

  it('never applies a live-site override for a suspended tenant (status-gate gap)', async () => {
    // Before this fix, runAutopilot() read seo_changes and applied straight
    // to seo_overrides with zero tenant-status check -- a suspended tenant's
    // live title/meta kept getting silently rewritten indefinitely.
    changeRows = changeFor('t-susp', 'sc-domain:suspended.com', 'https://suspended.com/emergency-cleaning', 'c1')
    tenantRows = [{ id: 't-susp', status: 'suspended' }]

    const result = await runAutopilot()

    expect(result.applied).toBe(0)
    expect(overrideUpserts).toHaveLength(0)
  })

  it('never applies for a cancelled or deleted tenant either', async () => {
    changeRows = [
      ...changeFor('t-cancel', 'sc-domain:cancelled.com', 'https://cancelled.com/emergency-cleaning', 'c1'),
      ...changeFor('t-del', 'sc-domain:deleted.com', 'https://deleted.com/emergency-cleaning', 'c2'),
    ]
    tenantRows = [
      { id: 't-cancel', status: 'cancelled' },
      { id: 't-del', status: 'deleted' },
    ]

    const result = await runAutopilot()

    expect(result.applied).toBe(0)
    expect(overrideUpserts).toHaveLength(0)
  })

  it('still applies for a setup/pending tenant (servable before full activation)', async () => {
    changeRows = changeFor('t-setup', 'sc-domain:setup.com', 'https://setup.com/emergency-cleaning', 'c1')
    tenantRows = [{ id: 't-setup', status: 'setup' }]

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
  })

  it('wrong-tenant probe: a suspended tenant never suppresses a different, still-serving tenant in the same run', async () => {
    changeRows = [
      ...changeFor('t-susp', 'sc-domain:suspended.com', 'https://suspended.com/emergency-cleaning', 'c1'),
      ...changeFor('t-active', 'sc-domain:active.com', 'https://active.com/emergency-cleaning', 'c2'),
    ]
    tenantRows = [
      { id: 't-susp', status: 'suspended' },
      { id: 't-active', status: 'active' },
    ]

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
    expect(overrideUpserts).toHaveLength(1)
    expect(overrideUpserts[0].url).toBe('https://active.com/emergency-cleaning')
  })

  it('applies for a property with tenant_id: null (FL-owned / not yet linked) — never excluded by the status gate', async () => {
    changeRows = changeFor(null, 'sc-domain:unlinked.com', 'https://unlinked.com/emergency-cleaning', 'c1')
    tenantRows = []

    const result = await runAutopilot()

    expect(result.applied).toBe(1)
  })
})
