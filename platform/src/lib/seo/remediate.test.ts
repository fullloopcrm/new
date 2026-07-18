import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * remediate.ts's generateProposals() — spends paid Anthropic tokens per open
 * Tier-1 issue. Before this fix it read seo_issues with zero tenant-status
 * check, so a suspended/cancelled/deleted tenant's stale issues kept burning
 * AI spend on draft proposals (human-reviewed before anything applies, but
 * never free). Anthropic + fetch are mocked to a fixed response so the test
 * exercises only the tenant-status filter, not content generation.
 */

type Issue = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string | null
  recipe: string | null
  tier: number
  detail: Record<string, unknown>
  status: string
  type: string
}
type TenantRow = { id: string; status: string | null }

let issueRows: Issue[]
let tenantRows: TenantRow[]
let changeInserts: Array<Record<string, unknown>>
let anthropicCalls: number

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: async () => ({
    messages: {
      create: async () => {
        anthropicCalls++
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                title: 'Emergency Cleaning Services Today',
                meta: 'Reliable emergency cleaning services available today for your home or business.',
                rationale: 'test',
              }),
            },
          ],
        }
      },
    },
  }),
}))

vi.mock('../ssrf', () => ({
  safeFetch: async () => {
    throw new Error('no network in test')
  },
}))

function builder(table: string) {
  const eq: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    delete: () => chain,
    eq: (col: string, val: unknown) => {
      eq[col] = val
      return chain
    },
    neq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === 'seo_metrics') {
        return { data: { query: 'emergency cleaning', impressions: 100 }, error: null }
      }
      return { data: null, error: null }
    },
    insert: async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      if (table === 'seo_changes') changeInserts.push(...arr)
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_issues') {
        resolve({ data: issueRows, error: null })
        return
      }
      if (table === 'tenants') {
        resolve({ data: tenantRows, error: null })
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

import { generateProposals } from './remediate'

function issueFor(id: string, tenantId: string | null): Issue {
  return {
    id,
    property: 'sc-domain:example.com',
    tenant_id: tenantId,
    target_url: `https://example.com/${id}`,
    recipe: null,
    tier: 1,
    detail: {},
    status: 'open',
    type: 'striking_distance',
  }
}

beforeEach(() => {
  issueRows = []
  tenantRows = []
  changeInserts = []
  anthropicCalls = 0
})

describe('generateProposals()', () => {
  it('drafts a proposal for an issue linked to a still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-active')]
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await generateProposals({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
    expect(changeInserts.length).toBeGreaterThan(0)
  })

  it('drafts nothing for an issue linked to a cancelled tenant (status-gate gap: was burning AI spend indefinitely)', async () => {
    issueRows = [issueFor('i1', 't-cancel')]
    tenantRows = [{ id: 't-cancel', status: 'cancelled' }]

    const result = await generateProposals({ limit: 10 })

    expect(result.issues).toBe(0)
    expect(anthropicCalls).toBe(0)
    expect(changeInserts).toHaveLength(0)
  })

  it('never excludes an issue with tenant_id: null (unlinked/FL-owned)', async () => {
    issueRows = [issueFor('i1', null)]
    tenantRows = []

    const result = await generateProposals({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
  })

  it('wrong-tenant probe: a cancelled tenant never suppresses a different, still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-cancel'), issueFor('i2', 't-active')]
    tenantRows = [
      { id: 't-cancel', status: 'cancelled' },
      { id: 't-active', status: 'active' },
    ]

    const result = await generateProposals({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
  })
})
