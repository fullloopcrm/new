import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/ai-chat — first route-level regression test (P1/W1 O13
 * sweep; flagged by W4 cross-lane audit). The CRM copilot lets Claude call
 * tools that mutate bookings/clients through tenantDb — the confirm-gate on
 * destructive tools (update_bookings/cancel_bookings/create_booking) and the
 * tenant scoping tenantDb provides are the two things most worth pinning down
 * here, since a regression in either lets an unconfirmed action execute or a
 * cross-tenant row leak/mutate.
 *
 * The Anthropic SDK is mocked (no network, no real key) — each test drives a
 * scripted sequence of `messages.create` responses (tool_use then end_turn,
 * or straight to end_turn) the same way invoice-lifecycle.test.ts scripts
 * Stripe. `.or()`/`.ilike()` (used only by the two read-only search_* tools)
 * are stubbed as pass-through no-ops since tenant-db-fake doesn't implement
 * PostgREST text search — those two tools' query-building is already covered
 * behaviorally/source-invariantly by postgrest-injection-routes.test.ts, so
 * this file exercises the mutating + tenant-scoped-read tools instead.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  tenant: {} as Record<string, unknown>,
  create: vi.fn(),
  getTenantForRequest: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  tenant: Record<string, unknown>
  create: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getTenantForRequest: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      chain.or = () => chain
      chain.ilike = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: (...a: unknown[]) => h.getTenantForRequest(...a),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => h.create(...a) }
  },
}))

import { POST } from './route'
import { AuthError } from '@/lib/tenant-query'

const chatReq = (messages: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify({ messages }) })

function endTurn(text: string) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] }
}
function toolUse(name: string, input: Record<string, unknown>, id = 'tool-1') {
  return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id, name, input }] }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.tenant = { id: 'tenant-A', name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'plaintext-key' }
  h.create.mockReset()
  h.getTenantForRequest.mockReset()
  h.getTenantForRequest.mockImplementation(async () => ({ tenantId: h.tenantId, tenant: h.tenant }))
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice', email: 'a@x.com', status: 'active', do_not_service: false },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Bob', email: 'b@x.com', status: 'active', do_not_service: false },
    ],
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', client_id: 'client-A1', status: 'scheduled', price: 10000, start_time: '2026-08-01T10:00:00', payment_status: 'unpaid' },
      { id: 'book-B1', tenant_id: 'tenant-B', client_id: 'client-B1', status: 'scheduled', price: 10000, start_time: '2026-08-01T10:00:00', payment_status: 'unpaid' },
    ],
  }
})

describe('POST /api/admin/ai-chat — request validation', () => {
  it('rejects a non-array messages body with 400 before calling Anthropic', async () => {
    const res = await POST(chatReq('not an array'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'messages array required' })
    expect(h.create).not.toHaveBeenCalled()
  })

  it('returns 500 when neither the tenant nor the platform has an Anthropic key', async () => {
    h.tenant.anthropic_api_key = null
    const savedEnvKey = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY

    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'ANTHROPIC_API_KEY not configured' })
    expect(h.create).not.toHaveBeenCalled()

    if (savedEnvKey) process.env.ANTHROPIC_API_KEY = savedEnvKey
  })

  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    h.getTenantForRequest.mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await POST(chatReq([{ role: 'user', content: 'hi' }]))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
  })
})

describe('POST /api/admin/ai-chat — conversation loop', () => {
  it('returns the text reply directly on an immediate end_turn', async () => {
    h.create.mockResolvedValueOnce(endTurn('You have 1 booking today.'))

    const res = await POST(chatReq([{ role: 'user', content: 'how many bookings today?' }]))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ reply: 'You have 1 booking today.' })
  })

  it('executes a tool call, feeds the result back, and returns the follow-up end_turn reply', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('query_bookings', { status: 'scheduled' }))
      .mockResolvedValueOnce(endTurn('You have 1 scheduled booking.'))

    const res = await POST(chatReq([{ role: 'user', content: 'show scheduled bookings' }]))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ reply: 'You have 1 scheduled booking.' })
    expect(h.create).toHaveBeenCalledTimes(2)

    // Tool result fed back to the model must reflect only tenant-A's booking.
    const secondCallArgs = h.create.mock.calls[1][0] as { messages: Array<{ role: string; content: unknown }> }
    const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
    const parsed = JSON.parse(toolResultMsg.content[0].content)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('book-A1')
  })

  it('gives up after too many tool-call iterations', async () => {
    h.create.mockResolvedValue(toolUse('get_revenue_stats', { date_from: '2026-01-01', date_to: '2026-12-31' }))

    const res = await POST(chatReq([{ role: 'user', content: 'loop forever' }]))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ reply: 'Something went wrong — too many tool calls.' })
    expect(h.create).toHaveBeenCalledTimes(10)
  })
})

describe('POST /api/admin/ai-chat — tool tenant isolation + confirm gates', () => {
  it('query_bookings only ever returns the caller tenant’s own bookings', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('query_bookings', {}))
      .mockResolvedValueOnce(endTurn('done'))

    await POST(chatReq([{ role: 'user', content: 'list bookings' }]))

    const secondCallArgs = h.create.mock.calls[1][0] as { messages: Array<{ content: unknown }> }
    const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
    const parsed = JSON.parse(toolResultMsg.content[0].content) as Array<{ id: string }>
    expect(parsed.map((b) => b.id)).toEqual(['book-A1'])
  })

  it('update_bookings without confirmed:true asks for confirmation and never mutates', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('update_bookings', { booking_ids: ['book-A1'], updates: { status: 'completed' } }))
      .mockResolvedValueOnce(endTurn('Please confirm.'))

    await POST(chatReq([{ role: 'user', content: 'mark it done' }]))

    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('scheduled')
    const secondCallArgs = h.create.mock.calls[1][0] as { messages: Array<{ content: unknown }> }
    const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
    const parsed = JSON.parse(toolResultMsg.content[0].content)
    expect(parsed.needs_confirmation).toBe(true)
  })

  it('update_bookings with confirmed:true updates only the caller tenant’s own booking, never another tenant’s', async () => {
    h.create
      .mockResolvedValueOnce(
        toolUse('update_bookings', { booking_ids: ['book-A1', 'book-B1'], updates: { status: 'completed' }, confirmed: true })
      )
      .mockResolvedValueOnce(endTurn('Updated.'))

    await POST(chatReq([{ role: 'user', content: 'mark both done, confirmed' }]))

    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('completed')
    // tenantDb's own .eq('tenant_id', ...) means the cross-tenant id never matches — the
    // other tenant's row is untouched regardless of what the response claims succeeded.
    expect(h.store.bookings.find((b) => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('cancel_bookings without confirmed:true asks for confirmation and never mutates', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('cancel_bookings', { booking_ids: ['book-A1'] }))
      .mockResolvedValueOnce(endTurn('Please confirm.'))

    await POST(chatReq([{ role: 'user', content: 'cancel it' }]))

    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('scheduled')
  })

  it('cancel_bookings with confirmed:true cancels only the caller tenant’s booking', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('cancel_bookings', { booking_ids: ['book-A1', 'book-B1'], confirmed: true }))
      .mockResolvedValueOnce(endTurn('Cancelled.'))

    await POST(chatReq([{ role: 'user', content: 'cancel both, confirmed' }]))

    expect(h.store.bookings.find((b) => b.id === 'book-A1')?.status).toBe('cancelled')
    expect(h.store.bookings.find((b) => b.id === 'book-B1')?.status).toBe('scheduled')
  })

  it('create_booking without confirmed:true asks for confirmation and never inserts', async () => {
    h.create
      .mockResolvedValueOnce(toolUse('create_booking', { client_id: 'client-A1', start_time: '2026-08-05T09:00:00' }))
      .mockResolvedValueOnce(endTurn('Please confirm.'))

    await POST(chatReq([{ role: 'user', content: 'book alice for aug 5' }]))

    expect(h.store.bookings.length).toBe(2)
  })

  it('create_booking with confirmed:true inserts a booking stamped with the caller tenant_id', async () => {
    h.create
      .mockResolvedValueOnce(
        toolUse('create_booking', { client_id: 'client-A1', start_time: '2026-08-05T09:00:00', confirmed: true })
      )
      .mockResolvedValueOnce(endTurn('Booked.'))

    await POST(chatReq([{ role: 'user', content: 'book alice for aug 5, confirmed' }]))

    const created = h.store.bookings.find((b) => b.client_id === 'client-A1' && b.start_time === '2026-08-05T09:00:00')
    expect(created).toBeDefined()
    expect(created?.tenant_id).toBe('tenant-A')
  })

  it("get_client_details can never fetch another tenant's client", async () => {
    h.create
      .mockResolvedValueOnce(toolUse('get_client_details', { client_id: 'client-B1' }))
      .mockResolvedValueOnce(endTurn('done'))

    await POST(chatReq([{ role: 'user', content: 'details for client-B1' }]))

    const secondCallArgs = h.create.mock.calls[1][0] as { messages: Array<{ content: unknown }> }
    const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
    const parsed = JSON.parse(toolResultMsg.content[0].content)
    expect(parsed.error).toBeTruthy()
    expect(parsed.client).toBeUndefined()
  })
})
