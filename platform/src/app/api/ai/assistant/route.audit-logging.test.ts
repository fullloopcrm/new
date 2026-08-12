import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * The tenant dashboard assistant (this route) had ZERO audit logging before
 * phase3 — no `audit` import anywhere in the file. Its executeTool() is the
 * single dispatcher every tool call goes through (the POST loop calls
 * nothing else), so wrapping it there is the one place needed to cover all
 * 9 tools. This proves a tool call now produces a real audit_logs row with
 * the 'assistant.tool_call' action.
 *
 * #3 fold (2026-07-30): tools with no dashboard-specific handler (like
 * lookup_client, ex-"search_clients") now dispatch straight through the
 * shared runTool() (src/lib/selena/tools.ts), which ALSO writes its own
 * 'yinez.tool_call' row internally — two rows per call now, not one. Both
 * are truthful and distinguishable by action name; see the comment above
 * executeTool() in route.ts for why this redundancy is accepted rather than
 * suppressed.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-a',
    tenantId: TENANT_A,
    tenant: { id: TENANT_A, name: 'Tenant A', industry: 'cleaning', anthropic_api_key: 'stored-key' },
    role: 'owner',
  })),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/postgrest-safe', () => ({ sanitizePostgrestValue: (v: string) => v }))
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => {}) }))

const createMock = vi.fn()
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({ messages: { create: createMock } }),
}))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [{ id: 'client-a', tenant_id: TENANT_A, name: 'Jane', email: 'jane@x.com', phone: '555', address: '1 Main St', active: true, notes: null }],
  })
  holder.from = h.from
  createMock.mockReset()
})

function post(messages: unknown[]) {
  return POST(new Request('http://t/api/ai/assistant', { method: 'POST', body: JSON.stringify({ messages }) }))
}

function toolTurn(name: string, input: Record<string, unknown>) {
  createMock
    .mockResolvedValueOnce({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'call-1', name, input }] })
    .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.' }] })
}

describe('ai/assistant executeTool writes to audit_logs', () => {
  it('a tool call writes one audit_logs row with action assistant.tool_call', async () => {
    toolTurn('lookup_client', { query: 'Jane' })

    const res = await post([{ role: 'user', content: 'find Jane' }])
    expect(res.status).toBe(200)

    const auditInserts = h.capture.inserts.filter((i) => i.table === 'audit_logs')
    expect(auditInserts).toHaveLength(2)

    const assistantRow = auditInserts.find((i) => i.rows[0].action === 'assistant.tool_call')
    expect(assistantRow?.rows[0]).toMatchObject({
      tenant_id: TENANT_A,
      action: 'assistant.tool_call',
      entity_type: 'lookup_client',
    })
    const details = assistantRow?.rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'agent', role: 'owner', success: true })

    // The shared runTool() dispatcher writes its own internal audit row for
    // the same call — same tool name both times, this route does no remapping.
    const yinezRow = auditInserts.find((i) => i.rows[0].action === 'yinez.tool_call')
    expect(yinezRow?.rows[0]).toMatchObject({
      tenant_id: TENANT_A,
      action: 'yinez.tool_call',
      entity_type: 'lookup_client',
    })
  })
})
