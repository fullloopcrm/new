import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/ai/assistant — tool permission gating.
 *
 * BUG (fixed here): this route's tool dispatch (update_bookings,
 * cancel_bookings, update_client, get_revenue_stats) had NO permission
 * check at all — only getTenantForRequest() (proves tenant membership at
 * ANY role). admin/ai-chat/route.ts's own TOOL_PERMISSIONS comment flagged
 * this exact route as having "the same gap (unguarded), not fixed here."
 * By default rbac.ts denies 'staff' bookings.edit/clients.edit/finance.view
 * — so any staff-tier member using the Selena chat bar (dashboard/selena-bar.tsx)
 * could have the assistant update/cancel bookings, edit client records, or
 * pull revenue stats, all of which the equivalent REST endpoints already 403
 * on for staff.
 *
 * FIX: TOOL_PERMISSIONS map + hasPermission() check inside executeTool,
 * mirroring admin/ai-chat/route.ts exactly.
 */

const TENANT_A = 'tid-assistant-rbac-a'

const holder = vi.hoisted(() => ({
  from: null as null | Harness['from'],
  role: 'owner' as string,
  tenant: {} as Record<string, unknown>,
}))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-a',
    tenantId: TENANT_A,
    role: holder.role,
    tenant: holder.tenant,
  })),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

const createMock = vi.fn()
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({ messages: { create: createMock } }),
}))

import { POST } from './route'

function seed() {
  return {
    bookings: [
      { id: 'booking-a', tenant_id: TENANT_A, status: 'scheduled', team_member_id: 'tm-a', price: 10000, start_time: '2026-06-01T10:00:00' },
    ] as Record<string, unknown>[],
    clients: [
      { id: 'client-a', tenant_id: TENANT_A, name: 'Client A', email: 'a@example.com' },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.role = 'owner'
  holder.tenant = { id: TENANT_A, name: 'Tenant A', industry: 'cleaning', anthropic_api_key: 'stored-key' }
  createMock.mockReset()
})

function post(messages: unknown[]) {
  return POST(new Request('http://t/api/ai/assistant', { method: 'POST', body: JSON.stringify({ messages }) }))
}

async function runTool(name: string, input: Record<string, unknown>) {
  createMock
    .mockResolvedValueOnce({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'call-1', name, input }] })
    .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done.' }] })

  await post([{ role: 'user', content: 'go' }])
  const secondCallArgs = createMock.mock.calls[1][0] as { messages: Array<{ content: unknown }> }
  const toolResultMsg = secondCallArgs.messages.at(-1) as { content: Array<{ content: string }> }
  return JSON.parse(toolResultMsg.content[0].content)
}

describe('ai/assistant — tool permission gating', () => {
  it("PERMISSION PROBE: staff cannot update_bookings (lacks bookings.edit) — the mutation never runs", async () => {
    holder.role = 'staff'
    const result = await runTool('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { status: 'completed' },
      confirmed: true,
    })
    expect(result).toEqual({ error: "You don't have permission to do that (requires bookings.edit)." })
    expect(h.seed.bookings.find((b) => b.id === 'booking-a')?.status).toBe('scheduled')
  })

  it('PERMISSION PROBE: staff cannot cancel_bookings (lacks bookings.edit)', async () => {
    holder.role = 'staff'
    const result = await runTool('cancel_bookings', { booking_ids: ['booking-a'], confirmed: true })
    expect(result).toEqual({ error: "You don't have permission to do that (requires bookings.edit)." })
    expect(h.seed.bookings.find((b) => b.id === 'booking-a')?.status).toBe('scheduled')
  })

  it('PERMISSION PROBE: staff cannot update_client (lacks clients.edit)', async () => {
    holder.role = 'staff'
    const result = await runTool('update_client', { client_id: 'client-a', updates: { name: 'Renamed' } })
    expect(result).toEqual({ error: "You don't have permission to do that (requires clients.edit)." })
    expect(h.seed.clients.find((c) => c.id === 'client-a')?.name).toBe('Client A')
  })

  it('PERMISSION PROBE: staff cannot get_revenue_stats (lacks finance.view)', async () => {
    holder.role = 'staff'
    const result = await runTool('get_revenue_stats', { date_from: '2026-01-01', date_to: '2026-12-31' })
    expect(result).toEqual({ error: "You don't have permission to do that (requires finance.view)." })
  })

  it('CONTROL: manager (has bookings.edit) can update_bookings', async () => {
    holder.role = 'manager'
    const result = await runTool('update_bookings', { booking_ids: ['booking-a'], updates: { status: 'completed' }, confirmed: true })
    expect(result.success).toBe(true)
  })

  it('CONTROL: manager (has bookings.edit) can cancel_bookings', async () => {
    holder.role = 'manager'
    const result = await runTool('cancel_bookings', { booking_ids: ['booking-a'], confirmed: true })
    expect(result.success).toBe(true)
  })

  it('CONTROL: manager (has clients.edit) can update_client', async () => {
    holder.role = 'manager'
    const result = await runTool('update_client', { client_id: 'client-a', updates: { name: 'Renamed' } })
    expect(result.success).toBe(true)
  })

  it('CONTROL: manager (has finance.view) can get_revenue_stats', async () => {
    holder.role = 'manager'
    const result = await runTool('get_revenue_stats', { date_from: '2026-01-01', date_to: '2026-12-31' })
    expect(result.error).toBeUndefined()
    expect(result.total_bookings).toBe(1)
  })

  it("PERMISSION PROBE: a tenant override granting staff 'bookings.edit' allows staff to update_bookings", async () => {
    holder.role = 'staff'
    holder.tenant = {
      id: TENANT_A, name: 'Tenant A', industry: 'cleaning', anthropic_api_key: 'stored-key',
      selena_config: { role_permissions: { staff: { 'bookings.edit': true } } },
    }
    const result = await runTool('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { status: 'completed' },
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('CONTROL: read-only tools (search_clients, query_bookings) remain ungated for staff', async () => {
    holder.role = 'staff'
    const result = await runTool('search_clients', { query: 'Client' })
    expect(Array.isArray(result)).toBe(true)
  })
})
