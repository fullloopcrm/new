import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Regression test for the cross-tenant misleading-response bug (flagged by
 * W1): update_bookings/cancel_bookings scoped every mutation with
 * `.eq('id', id).eq('tenant_id', tenantId)`, so a foreign-tenant id was
 * never actually written (tenant isolation held) — but the handler reported
 * `success:true, updated: ids.length` / `cancelled: ids.length` regardless
 * of how many rows the tenant filter actually matched. The response lied
 * about what happened. Fix: use `.select('id')` on the update to see which
 * rows were really touched and reflect that honestly (success:false /
 * updated:0 for zero matches; partial counts + not_found for a mixed
 * batch).
 */

const CTX_TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    tenantId: CTX_TENANT,
    tenant: { id: CTX_TENANT, name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: null },
  })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const anthropicCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => anthropicCreate(...a) }
  },
}))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'book-A1', tenant_id: CTX_TENANT, client_id: 'client-A1', status: 'scheduled', price: 10000 },
      { id: 'book-B1', tenant_id: OTHER_TENANT, client_id: 'client-B1', status: 'scheduled', price: 10000 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  anthropicCreate.mockReset()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

function chatReq(messages: unknown) {
  return new Request('http://x/api/admin/ai-chat', { method: 'POST', body: JSON.stringify({ messages }) })
}
function endTurn(text: string) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] }
}
function toolUse(name: string, input: Record<string, unknown>) {
  return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tool-1', name, input }] }
}

async function runTool(name: string, input: Record<string, unknown>) {
  anthropicCreate.mockResolvedValueOnce(toolUse(name, input)).mockResolvedValueOnce(endTurn('done'))
  await POST(chatReq([{ role: 'user', content: 'go' }]))
  const secondCallArgs = anthropicCreate.mock.calls[1][0] as { messages: Array<{ content: unknown }> }
  const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
  return JSON.parse(toolResultMsg.content[0].content)
}

describe('admin/ai-chat — update_bookings response honesty', () => {
  it('wrong-tenant probe: an id belonging to another tenant reports success:false, updated:0 (not a silent no-op success)', async () => {
    const result = await runTool('update_bookings', {
      booking_ids: ['book-B1'],
      updates: { status: 'completed' },
      confirmed: true,
    })

    expect(result).toEqual({
      success: false,
      updated: 0,
      message: expect.stringContaining('nothing was updated'),
    })
    // Cross-tenant mutation still never happens.
    expect(h.seed.bookings.find(b => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('a mixed batch reports the true partial count and lists the foreign id as not_found', async () => {
    const result = await runTool('update_bookings', {
      booking_ids: ['book-A1', 'book-B1'],
      updates: { status: 'completed' },
      confirmed: true,
    })

    expect(result.success).toBe(true)
    expect(result.updated).toBe(1)
    expect(result.not_found).toEqual(['book-B1'])
    expect(h.seed.bookings.find(b => b.id === 'book-A1')?.status).toBe('completed')
    expect(h.seed.bookings.find(b => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('an all-own-tenant batch still reports the plain success shape', async () => {
    const result = await runTool('update_bookings', {
      booking_ids: ['book-A1'],
      updates: { status: 'completed' },
      confirmed: true,
    })

    expect(result).toEqual({ success: true, updated: 1 })
  })
})

describe('admin/ai-chat — cancel_bookings response honesty', () => {
  it('wrong-tenant probe: an id belonging to another tenant reports success:false, cancelled:0', async () => {
    const result = await runTool('cancel_bookings', { booking_ids: ['book-B1'], confirmed: true })

    expect(result).toEqual({
      success: false,
      cancelled: 0,
      message: expect.stringContaining('nothing was cancelled'),
    })
    expect(h.seed.bookings.find(b => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('a mixed batch reports the true partial count and lists the foreign id as not_found', async () => {
    const result = await runTool('cancel_bookings', { booking_ids: ['book-A1', 'book-B1'], confirmed: true })

    expect(result.success).toBe(true)
    expect(result.cancelled).toBe(1)
    expect(result.not_found).toEqual(['book-B1'])
    expect(h.seed.bookings.find(b => b.id === 'book-A1')?.status).toBe('cancelled')
    expect(h.seed.bookings.find(b => b.id === 'book-B1')?.status).toBe('scheduled')
  })
})
