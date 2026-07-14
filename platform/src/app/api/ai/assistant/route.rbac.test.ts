import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/ai/assistant only checked getTenantForRequest() (any authenticated
 * tenant member, any role) before letting the model execute tools that mutate
 * data or expose finance figures — update_bookings/cancel_bookings/
 * update_client/get_revenue_stats. The equivalent REST endpoints gate these
 * behind requirePermission('bookings.edit'/'clients.edit'/'finance.view'),
 * which 'staff' does not hold (rbac.ts) — but the AI tool-execution path
 * bypassed that check entirely, letting a 'staff' member reach privileged
 * mutations/finance data through the chat widget that the REST API would
 * 403 on directly.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = {
  clients: [{ id: 'c1', tenant_id: TENANT, name: 'Old Name' }],
}
let actorRole = 'staff'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          return res({ data: null, error: null })
        }
        return res({ data: (store[table] || []).filter(match), error: null })
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

// Two-turn Anthropic mock: first call emits a tool_use for update_client,
// second call (after the tool result is appended) ends the turn.
let createCallCount = 0
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => {
        createCallCount++
        if (createCallCount === 1) {
          return {
            stop_reason: 'tool_use',
            content: [{
              type: 'tool_use',
              id: 't1',
              name: 'update_client',
              input: { client_id: 'c1', updates: { name: 'New Name' } },
            }],
          }
        }
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'done' }] }
      },
    },
  }),
}))

process.env.ANTHROPIC_API_KEY = 'test-key'

import { POST } from '@/app/api/ai/assistant/route'

function req(): Request {
  return new Request('https://x/api/ai/assistant', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'rename client c1 to New Name' }] }),
  })
}

describe('POST /api/ai/assistant — tool execution respects RBAC', () => {
  beforeEach(() => {
    createCallCount = 0
    store.clients = [{ id: 'c1', tenant_id: TENANT, name: 'Old Name' }]
  })

  it('blocks a staff member from having the assistant update a client (no clients.edit)', async () => {
    actorRole = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(store.clients[0].name).toBe('Old Name')
  })

  it('allows an admin (has clients.edit) to have the assistant update a client', async () => {
    actorRole = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(store.clients[0].name).toBe('New Name')
  })
})
