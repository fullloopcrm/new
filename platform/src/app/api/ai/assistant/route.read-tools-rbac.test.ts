import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The read-only assistant tools (search_clients, get_client_details,
 * search_team_members, query_bookings, get_schedule_summary) had no entry in
 * TOOL_PERMISSIONS at all -- unlike update_bookings/cancel_bookings/
 * update_client/get_revenue_stats. The chat widget (dashboard/selena-bar.tsx)
 * has no client-side role gate, so TOOL_PERMISSIONS is the only enforcement
 * point: any tenant member could ask the assistant to search clients or team
 * members and get full PII / pay_rate back, bypassing the same
 * clients.view/team.view/bookings.view RBAC overrides already enforced on
 * the equivalent REST endpoints (GET /api/clients, /api/team, /api/bookings).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {}
let actorRole = 'staff'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      or: () => c,
      order: () => c,
      limit: () => c,
      ilike: () => c,
      insert: () => c,
      gte: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        const found = (store[table] || []).find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        const rows = (store[table] || []).filter((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
        return res({ data: rows, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT,
    role: actorRole,
    tenant: { name: 'Acme', industry: 'cleaning', anthropic_api_key: null },
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/postgrest-safe', () => ({ sanitizePostgrestValue: (v: string) => v }))

let capturedToolResult: string | null = null
let createCallCount = 0

function mockAssistantFor(toolName: string, input: Record<string, unknown>) {
  createCallCount = 0
  capturedToolResult = null
  return {
    messages: {
      create: async (args: { messages: Array<{ role: string; content: unknown }> }) => {
        createCallCount++
        if (createCallCount === 1) {
          return {
            stop_reason: 'tool_use',
            content: [{ type: 'tool_use', id: 't1', name: toolName, input }],
          }
        }
        const toolResultMsg = args.messages[args.messages.length - 1]
        const toolResults = toolResultMsg.content as Array<{ content: string }>
        capturedToolResult = toolResults[0].content
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'done' }] }
      },
    },
  }
}

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => currentMock,
}))

let currentMock: ReturnType<typeof mockAssistantFor>

process.env.ANTHROPIC_API_KEY = 'test-key'

import { POST } from '@/app/api/ai/assistant/route'

function req(): Request {
  return new Request('https://x/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'search for jane' }] }),
  })
}

describe('POST /api/ai/assistant — read-tool RBAC gate', () => {
  beforeEach(() => {
    store.clients = [{ id: 'c1', tenant_id: TENANT, name: 'Jane Doe', email: 'jane@x.com' }]
    store.team_members = [{ id: 'tm1', tenant_id: TENANT, name: 'Bob', pay_rate: 22, status: 'active' }]
    store.bookings = [{ id: 'b1', tenant_id: TENANT, status: 'scheduled', price: 100 }]
  })

  it('blocks a permission-less role from search_clients', async () => {
    actorRole = 'nonexistent-role-with-no-perms'
    currentMock = mockAssistantFor('search_clients', { query: 'jane' })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).toContain("don't have permission")
    expect(capturedToolResult).not.toContain('jane@x.com')
  })

  it('allows staff (has clients.view) to use search_clients', async () => {
    actorRole = 'staff'
    currentMock = mockAssistantFor('search_clients', { query: 'jane' })
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).toContain('jane@x.com')
  })

  it('blocks a permission-less role from search_team_members (pay_rate leak)', async () => {
    actorRole = 'nonexistent-role-with-no-perms'
    currentMock = mockAssistantFor('search_team_members', {})
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).toContain("don't have permission")
    expect(capturedToolResult).not.toContain('"pay_rate"')
  })

  it('allows staff (has team.view) to use search_team_members', async () => {
    actorRole = 'staff'
    currentMock = mockAssistantFor('search_team_members', {})
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).toContain('"pay_rate"')
  })

  it('blocks a permission-less role from query_bookings', async () => {
    actorRole = 'nonexistent-role-with-no-perms'
    currentMock = mockAssistantFor('query_bookings', {})
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).toContain("don't have permission")
  })

  it('allows staff (has bookings.view) to use query_bookings', async () => {
    actorRole = 'staff'
    currentMock = mockAssistantFor('query_bookings', {})
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(capturedToolResult).not.toContain("don't have permission")
  })
})
