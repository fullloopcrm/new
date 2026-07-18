import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * enrich.ts's generateEnrichments() — spends paid Anthropic tokens per open
 * deep_underperformer issue. Before this fix it read seo_issues with zero
 * tenant-status check, so a suspended/cancelled/deleted tenant's stale
 * issues kept burning AI spend on content drafts indefinitely (human-
 * reviewed before anything applies, but never free). Mirrors
 * remediate.test.ts's mock shape, plus the tenant-knowledge (Selena
 * persona/config) dependencies enrichment needs to ground its draft.
 */

type Issue = {
  id: string
  property: string
  tenant_id: string
  target_url: string | null
  detail: Record<string, unknown>
  status: string
  type: string
}
type TenantRow = { id: string; status: string | null }

let issueRows: Issue[]
let tenantRows: TenantRow[]
let changeInserts: Array<Record<string, unknown>>
let anthropicCalls: number

const GOOD_BODY =
  'When you need emergency cleaning fast, Example Co is ready to help homes and businesses across the Denver area. ' +
  'Our team responds quickly to spills, water damage aftermath, and other urgent messes, working efficiently to ' +
  'restore your space. Emergency cleaning requests are handled with care, using the right equipment for each ' +
  'situation, so you can get back to normal as soon as possible in the greater Denver region today and every day.'

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: async () => ({
    messages: {
      create: async () => {
        anthropicCalls++
        return {
          content: [
            { type: 'text', text: JSON.stringify({ heading: 'Emergency Cleaning', body: GOOD_BODY, rationale: 'test' }) },
          ],
        }
      },
    },
  }),
}))

vi.mock('@/lib/selena/agent-config-loader', () => ({
  getAgentConfig: async () => ({
    identity: { business_name: 'Example Co' },
    service_area: 'Denver',
    pricing: { copy: '$99 flat rate' },
    contact: {},
    policies: [],
  }),
}))

vi.mock('@/lib/selena/persona-file', () => ({
  getPersona: async () => ({}),
  renderPersonaExtras: () => '',
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
    update: () => chain,
    eq: () => chain,
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

import { generateEnrichments } from './enrich'

function issueFor(id: string, tenantId: string): Issue {
  return {
    id,
    property: 'sc-domain:example.com',
    tenant_id: tenantId,
    target_url: `https://example.com/${id}`,
    detail: { top_query: 'emergency cleaning' },
    status: 'open',
    type: 'deep_underperformer',
  }
}

beforeEach(() => {
  issueRows = []
  tenantRows = []
  changeInserts = []
  anthropicCalls = 0
})

describe('generateEnrichments()', () => {
  it('drafts an enrichment for an issue linked to a still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-active')]
    tenantRows = [{ id: 't-active', status: 'active' }]

    const result = await generateEnrichments({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
    expect(result.proposed).toBe(1)
  })

  it('drafts nothing for an issue linked to a suspended tenant (status-gate gap)', async () => {
    issueRows = [issueFor('i1', 't-susp')]
    tenantRows = [{ id: 't-susp', status: 'suspended' }]

    const result = await generateEnrichments({ limit: 10 })

    expect(result.issues).toBe(0)
    expect(anthropicCalls).toBe(0)
    expect(changeInserts).toHaveLength(0)
  })

  it('wrong-tenant probe: a suspended tenant never suppresses a different, still-serving tenant', async () => {
    issueRows = [issueFor('i1', 't-susp'), issueFor('i2', 't-active')]
    tenantRows = [
      { id: 't-susp', status: 'suspended' },
      { id: 't-active', status: 'active' },
    ]

    const result = await generateEnrichments({ limit: 10 })

    expect(result.issues).toBe(1)
    expect(anthropicCalls).toBe(1)
  })
})
