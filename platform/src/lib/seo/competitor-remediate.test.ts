import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * competitor-remediate.ts's generateCompetitorProposals() — spends paid
 * Anthropic tokens per open competitor_gap issue. Before this fix it read
 * seo_issues with zero tenant-status check, so a suspended/cancelled/deleted
 * tenant's stale competitor-gap issues kept burning AI spend indefinitely.
 * Mirrors remediate.test.ts's mock shape.
 */

type GapIssue = {
  id: string
  property: string
  tenant_id: string | null
  target_url: string | null
  detail: Record<string, unknown>
  status: string
  type: string
}
type TenantRow = { id: string; status: string | null }

let issueRows: GapIssue[]
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
                title: 'Emergency Cleaning Beats The Competition',
                meta: 'Faster, more reliable emergency cleaning than the other guys, available today.',
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
  const chain = {
    select: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => chain,
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

import { generateCompetitorProposals } from './competitor-remediate'

function issueFor(id: string, tenantId: string | null): GapIssue {
  return {
    id,
    property: 'sc-domain:example.com',
    tenant_id: tenantId,
    target_url: `https://example.com/${id}`,
    detail: { query: 'emergency cleaning', top_competitor_domain: 'rival.com', top_competitor_title: 'Rival Cleaning' },
    status: 'open',
    type: 'competitor_gap',
  }
}

beforeEach(() => {
  issueRows = []
  tenantRows = []
  changeInserts = []
  anthropicCalls = 0
})

describe('generateCompetitorProposals()', () => {
  it('drafts a proposal for a gap issue linked to a still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-active')]
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await generateCompetitorProposals({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
  })

  it('drafts nothing for a gap issue linked to a deleted tenant (status-gate gap)', async () => {
    issueRows = [issueFor('i1', 't-del')]
    tenantRows = [{ id: 't-del', status: 'deleted' }]

    const result = await generateCompetitorProposals({ limit: 10 })

    expect(result.issues).toBe(0)
    expect(anthropicCalls).toBe(0)
  })

  it('wrong-tenant probe: a deleted tenant never suppresses a different, still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-del'), issueFor('i2', 't-active')]
    tenantRows = [
      { id: 't-del', status: 'deleted' },
      { id: 't-active', status: 'active' },
    ]

    const result = await generateCompetitorProposals({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
  })
})
