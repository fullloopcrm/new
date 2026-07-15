import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/ai-chat's `create_booking` tool (the CRM copilot's tool-call
 * dispatch — same attack-surface CLASS as `src/lib/selena/tools.ts`, see
 * P25/P30 in deploy-prep/cross-tenant-leak-register.md) now verifies both
 * `client_id` and `team_member_id` are tenant-owned before the `bookings`
 * insert runs (same FK-ownership pattern as P1/P11/P25) — unlike every
 * other mutating tool in this same file (`update_bookings`, `cancel_bookings`,
 * `update_client` all filter their target row by `.eq('tenant_id', tenantId)`,
 * which is sufficient there because those check the ROW being written;
 * `create_booking`'s foreign keys point at OTHER rows that must be verified
 * separately).
 *
 * `query_bookings` and `get_schedule_summary` (same file, same tool
 * dispatch) both embed `clients(name)` / `team_members!bookings_team_
 * member_id_fkey(name)` off these exact columns with no tenant filter on
 * the embedded side — PostgREST resolves the join regardless of which
 * tenant owns the joined row — so an unverified foreign id planted here
 * would have surfaced another tenant's client/employee name on the very
 * next "who's on the schedule" query. Same exfil class as P1/P11/P25.
 *
 * This is now a regression lock: a model-supplied foreign-tenant
 * client_id/team_member_id must be REJECTED, not inserted.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-a',
    tenantId: TENANT_A,
    role: 'owner',
    tenant: { id: TENANT_A, name: 'Tenant A', industry: 'cleaning', anthropic_api_key: 'stored-key' },
  })),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

// Only the tool-dispatch loop is under test — the model call itself is
// stubbed to always request `create_booking` once, then end the turn.
const createMock = vi.fn()
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({ messages: { create: createMock } }),
}))

import { POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'client-a', tenant_id: TENANT_A, name: 'Client A' },
      { id: 'client-b', tenant_id: TENANT_B, name: 'Victim Client B' },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: TENANT_A, name: 'Member A' },
      { id: 'tm-b', tenant_id: TENANT_B, name: 'Victim Member B' },
    ],
    bookings: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  createMock.mockReset()
})

function post(messages: unknown[]) {
  return POST(
    new NextRequest('http://t/api/admin/ai-chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  )
}

describe('admin/ai-chat create_booking — foreign client_id/team_member_id (BLOCKED)', () => {
  it('BLOCKED: tenant A cannot plant tenant B\'s client_id on a new booking', async () => {
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'create_booking',
            input: {
              client_id: 'client-b', // tenant B's real client
              start_time: '2026-08-01T09:00:00',
              confirmed: true,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done.' }],
      })

    const res = await post([{ role: 'user', content: 'book client B tomorrow at 9am' }])
    expect(res.status).toBe(200)

    // No booking was created for tenant A carrying the foreign client_id.
    const created = h.seed.bookings.find((b) => b.tenant_id === TENANT_A)
    expect(created).toBeUndefined()
  })

  it('BLOCKED: tenant A cannot plant tenant B\'s team_member_id on a new booking', async () => {
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'create_booking',
            input: {
              client_id: 'client-a', // tenant A's own client — valid
              team_member_id: 'tm-b', // tenant B's real employee — foreign
              start_time: '2026-08-01T09:00:00',
              confirmed: true,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done.' }],
      })

    const res = await post([{ role: 'user', content: 'book client A with member B tomorrow at 9am' }])
    expect(res.status).toBe(200)

    const created = h.seed.bookings.find((b) => b.tenant_id === TENANT_A)
    expect(created).toBeUndefined()
  })

  it('CONTROL: tenant A can create a booking with its own client_id + team_member_id', async () => {
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'create_booking',
            input: {
              client_id: 'client-a',
              team_member_id: 'tm-a',
              start_time: '2026-08-01T09:00:00',
              confirmed: true,
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Booked.' }],
      })

    const res = await post([{ role: 'user', content: 'book client A tomorrow at 9am' }])
    expect(res.status).toBe(200)

    const created = h.seed.bookings.find((b) => b.tenant_id === TENANT_A)
    expect(created).toBeTruthy()
    expect(created!.client_id).toBe('client-a')
    expect(created!.team_member_id).toBe('tm-a')
  })
})

describe('admin/ai-chat update_bookings — foreign team_member_id (BLOCKED)', () => {
  beforeEach(() => {
    h.seed.bookings.push({ id: 'booking-a', tenant_id: TENANT_A, status: 'scheduled', team_member_id: 'tm-a' })
  })

  it('BLOCKED: tenant A cannot reassign its own booking to tenant B\'s team_member_id', async () => {
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'update_bookings',
            input: { booking_ids: ['booking-a'], updates: { team_member_id: 'tm-b' }, confirmed: true },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done.' }],
      })

    const res = await post([{ role: 'user', content: 'reassign booking-a to member B' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.team_member_id).toBe('tm-a')
  })

  it('CONTROL: tenant A can reassign its own booking to its own team_member_id', async () => {
    h.seed.team_members.push({ id: 'tm-a2', tenant_id: TENANT_A, name: 'Member A2' })
    createMock
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'call-1',
            name: 'update_bookings',
            input: { booking_ids: ['booking-a'], updates: { team_member_id: 'tm-a2' }, confirmed: true },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done.' }],
      })

    const res = await post([{ role: 'user', content: 'reassign booking-a to member A2' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.team_member_id).toBe('tm-a2')
  })
})
