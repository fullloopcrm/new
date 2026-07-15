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

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], role: 'owner' as string }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    tenantId: CTX_TENANT,
    role: holder.role,
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
  holder.role = 'owner'
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

describe('admin/ai-chat — tool permission gating', () => {
  it('staff cannot cancel_bookings (lacks bookings.edit) — the mutation never runs', async () => {
    holder.role = 'staff'
    const result = await runTool('cancel_bookings', { booking_ids: ['book-A1'], confirmed: true })

    expect(result).toEqual({ error: "You don't have permission to do that (requires bookings.edit)." })
    expect(h.seed.bookings.find(b => b.id === 'book-A1')?.status).toBe('scheduled')
  })

  it('staff cannot update_bookings (lacks bookings.edit)', async () => {
    holder.role = 'staff'
    const result = await runTool('update_bookings', {
      booking_ids: ['book-A1'],
      updates: { status: 'completed' },
      confirmed: true,
    })

    expect(result).toEqual({ error: "You don't have permission to do that (requires bookings.edit)." })
    expect(h.seed.bookings.find(b => b.id === 'book-A1')?.status).toBe('scheduled')
  })

  it('staff cannot get_revenue_stats (lacks finance.view)', async () => {
    holder.role = 'staff'
    const result = await runTool('get_revenue_stats', { date_from: '2026-01-01', date_to: '2026-12-31' })

    expect(result).toEqual({ error: "You don't have permission to do that (requires finance.view)." })
  })

  it('staff CAN create_booking — staff has bookings.create by default', async () => {
    holder.role = 'staff'
    const result = await runTool('create_booking', {
      client_id: 'client-A1',
      start_time: '2026-08-01T10:00:00',
      confirmed: true,
    })

    expect(result.success).toBe(true)
  })

  it('manager (has bookings.edit) CAN cancel_bookings', async () => {
    holder.role = 'manager'
    const result = await runTool('cancel_bookings', { booking_ids: ['book-A1'], confirmed: true })

    expect(result).toEqual({ success: true, cancelled: 1 })
  })
})
