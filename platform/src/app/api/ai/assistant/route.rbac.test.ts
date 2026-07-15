import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * RBAC probe — ai/assistant/route.ts (the dashboard "Selena" copilot widget,
 * used by dashboard/selena-bar.tsx and components/ai-assistant.tsx).
 *
 * This route had NO permission gating at all on any of its 8 tools — unlike
 * its sibling admin/ai-chat (which had the same bypass, since fixed). Any
 * authenticated tenant member, including staff (the default role, which has
 * no clients.edit/bookings.edit/finance.view), could use this copilot to
 * read full client PII, mutate/cancel bookings, edit client records, and
 * pull revenue stats — bypassing the tenant's own RBAC entirely.
 *
 * Proves search_clients, update_client, and get_revenue_stats now respect
 * clients.view / clients.edit / finance.view.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentRole = 'staff'
let currentOverrides: Record<string, Record<string, boolean>> | null = null
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    userId: 'user-1',
    tenantId: 'tenant-A',
    tenant: { id: 'tenant-A', name: 'Acme', industry: 'cleaning', anthropic_api_key: 'stored-key', selena_config: { role_permissions: currentOverrides } },
    role: currentRole,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

// Simulates one tool_use turn (the given tool/input) followed by an end_turn.
// Captures every create() call's `messages` so the test can inspect what
// tool_result content the executed tool actually returned.
let toolCallQueue: Array<{ name: string; input: Record<string, unknown> }> = []
let createCalls = 0
const createCallArgs: Array<{ messages: Array<{ role: string; content: unknown }> }> = []
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async (params: { messages: Array<{ role: string; content: unknown }> }) => {
        createCallArgs.push(params)
        createCalls++
        if (createCalls === 1 && toolCallQueue.length > 0) {
          const call = toolCallQueue[0]
          return {
            stop_reason: 'tool_use',
            content: [{ type: 'tool_use', id: 'tool-1', name: call.name, input: call.input }],
          }
        }
        return {
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'done' }],
        }
      },
    },
  }),
}))

// Extracts the tool_result text content sent back to Anthropic on the call
// immediately after a tool_use — i.e. what executeTool() actually returned.
function toolResultFromCall(callIndex: number): string {
  const params = createCallArgs[callIndex]
  const lastMessage = params.messages[params.messages.length - 1] as { content: Array<{ type: string; content: string }> }
  const block = lastMessage.content.find(b => b.type === 'tool_result')
  return block?.content ?? ''
}

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'find clients named smith' }] }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentRole = 'staff'
  currentOverrides = null
  createCalls = 0
  createCallArgs.length = 0
  toolCallQueue = []
  fake._seed('clients', [
    { id: 'client-1', tenant_id: 'tenant-A', name: 'Smith Co', email: 's@x.com', phone: '555', address: '1 Main', active: true, notes: 'secret note' },
  ])
  fake._seed('bookings', [
    { id: 'b1', tenant_id: 'tenant-A', price: 10000, payment_status: 'paid', status: 'completed', start_time: '2026-01-01T00:00:00' },
  ])
})

describe('ai/assistant search_clients tool — RBAC gate', () => {
  it('staff (default role, has clients.view) gets real client rows back', async () => {
    toolCallQueue = [{ name: 'search_clients', input: { query: 'smith' } }]
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(toolResultFromCall(1)).toContain('Smith Co')
  })

  it('a role with clients.view revoked via tenant override gets denied, not real client data', async () => {
    currentOverrides = { staff: { 'clients.view': false } }
    toolCallQueue = [{ name: 'search_clients', input: { query: 'smith' } }]
    const res = await POST(req())
    expect(res.status).toBe(200) // route itself succeeds; the denial is in the tool result
    const result = toolResultFromCall(1)
    expect(result).toContain('do not have permission')
    expect(result).not.toContain('Smith Co')
    expect(result).not.toContain('secret note')
  })
})

describe('ai/assistant update_client tool — RBAC gate', () => {
  it('staff (default role, does NOT have clients.edit) is denied client mutation', async () => {
    toolCallQueue = [{ name: 'update_client', input: { client_id: 'client-1', updates: { notes: 'pwned' } } }]
    const res = await POST(req())
    expect(res.status).toBe(200)
    const result = toolResultFromCall(1)
    expect(result).toContain('do not have permission')
    expect(result).not.toContain('"success":true')
  })

  it('an admin (has clients.edit by default) can update a client via the copilot', async () => {
    currentRole = 'admin'
    toolCallQueue = [{ name: 'update_client', input: { client_id: 'client-1', updates: { notes: 'updated' } } }]
    const res = await POST(req())
    expect(res.status).toBe(200)
    const result = toolResultFromCall(1)
    expect(result).toContain('"success":true')
  })
})

describe('ai/assistant get_revenue_stats tool — RBAC gate', () => {
  it('staff (default role, finance.view is NOT granted by default) is denied revenue data', async () => {
    // rbac.ts staff defaults do not include finance.view at all.
    toolCallQueue = [{ name: 'get_revenue_stats', input: { date_from: '2026-01-01', date_to: '2026-01-31' } }]
    const res = await POST(req())
    expect(res.status).toBe(200)
    const result = toolResultFromCall(1)
    expect(result).toContain('do not have permission')
    expect(result).not.toContain('total_revenue')
  })

  it('a manager (has finance.view by default) can pull revenue via the AI copilot', async () => {
    currentRole = 'manager'
    toolCallQueue = [{ name: 'get_revenue_stats', input: { date_from: '2026-01-01', date_to: '2026-01-31' } }]
    const res = await POST(req())
    expect(res.status).toBe(200)
    const result = toolResultFromCall(1)
    expect(result).toContain('total_revenue')
  })
})
