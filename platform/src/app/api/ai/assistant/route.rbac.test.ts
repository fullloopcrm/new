import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Written 2026-07-14 to lock in per-role RBAC on AI-assistant tool calls.
 * Superseded 2026-08-06 by a deliberate product decision ("feat: give the
 * dashboard agent full-owner access to every backend capability", route.ts's
 * dashboardOnlyTools comment): whoever a tenant lets into their dashboard
 * chat gets the agent's full capability, no per-role gating, regardless of
 * whether they're owner/admin/manager/staff. This test now locks in THAT
 * behavior instead — a 'staff' member CAN use the assistant to do things
 * the equivalent REST endpoint would 403 them on directly. That's the
 * current, intentional design, not a gap.
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

describe('POST /api/ai/assistant — tool execution runs with full owner-level access', () => {
  beforeEach(() => {
    createCallCount = 0
    store.clients = [{ id: 'c1', tenant_id: TENANT, name: 'Old Name' }]
  })

  it('lets a staff member have the assistant update a client (dashboard-chat full-access design)', async () => {
    actorRole = 'staff'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(store.clients[0].name).toBe('New Name')
  })

  it('allows an admin to have the assistant update a client', async () => {
    actorRole = 'admin'
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(store.clients[0].name).toBe('New Name')
  })
})
