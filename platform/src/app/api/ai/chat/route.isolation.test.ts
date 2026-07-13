import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenantDb conversion probe — ai/chat/route.ts.
 * Converts the clients/bookings/team_members counts + recent-bookings grounding
 * query (all tenant-owned) to tenantDb(tenantId). Proves tenant A's AI system
 * prompt is grounded only in tenant A's own business data, never tenant B's
 * booking counts or booking details, even though both tenants have bookings
 * in the same table.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
let currentTenant: string

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let limitN: number | undefined
  let headCount = false

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: (_cols: string, opts?: { head?: boolean }) => {
      headCount = !!opts?.head
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: (n: number) => {
      limitN = n
      return chain
    },
    then: (resolve: (v: { data: Row[] | null; count: number | null; error: null }) => unknown) =>
      resolve({ data: headCount ? null : rows(), count: rows().length, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenant: { name: 'Test Tenant', industry: 'towing', anthropic_api_key: null },
    tenantId: currentTenant,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

let capturedSystemPrompt = ''
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async (opts: { system: string }) => {
        capturedSystemPrompt = opts.system
        return { content: [{ type: 'text', text: 'ok' }] }
      },
    },
  }),
}))

process.env.ANTHROPIC_API_KEY = 'test-key'

import { POST } from './route'

beforeEach(() => {
  capturedSystemPrompt = ''
  store = {
    bookings: [
      { id: 'booking-A1', tenant_id: 'tenant-A', status: 'scheduled', start_time: '2026-07-15T09:00:00', final_price: 111 },
      { id: 'booking-B1', tenant_id: 'tenant-B', status: 'scheduled', start_time: '2026-07-15T09:00:00', final_price: 999999 },
      { id: 'booking-B2', tenant_id: 'tenant-B', status: 'scheduled', start_time: '2026-07-16T09:00:00', final_price: 888888 },
    ],
    clients: [{ id: 'c-a', tenant_id: 'tenant-A' }],
    team_members: [{ id: 't-a', tenant_id: 'tenant-A' }],
  }
})

function postChat(tenantId: string) {
  currentTenant = tenantId
  return POST(new Request('http://x/api/ai/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) }))
}

describe('ai/chat POST — tenantDb isolation (business-context grounding query)', () => {
  it('tenant A\'s system prompt reflects only tenant A\'s booking count, not tenant B\'s', async () => {
    const res = await postChat('tenant-A')
    expect(res.status).toBe(200)
    expect(capturedSystemPrompt).toContain('1 bookings')
    expect(capturedSystemPrompt).not.toContain('999999')
    expect(capturedSystemPrompt).not.toContain('888888')
  })

  it('tenant B\'s system prompt reflects only tenant B\'s own bookings, not tenant A\'s', async () => {
    const res = await postChat('tenant-B')
    expect(res.status).toBe(200)
    expect(capturedSystemPrompt).toContain('2 bookings')
    expect(capturedSystemPrompt).toContain('999999')
    expect(capturedSystemPrompt).toContain('888888')
    expect(capturedSystemPrompt).not.toContain('booking-A1')
  })
})
