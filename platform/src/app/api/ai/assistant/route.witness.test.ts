import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * ai/assistant's `update_bookings` tool (the client-facing widget's tool-call
 * dispatch — same attack-surface CLASS as admin/ai-chat's `create_booking`
 * and src/lib/selena/tools.ts, see P25/P30 in
 * deploy-prep/cross-tenant-leak-register.md) now verifies a model-supplied
 * `updates.team_member_id` is tenant-owned before the `bookings` update runs.
 *
 * The `.eq('id', id).eq('tenant_id', tenantId)` WHERE clause on the update
 * only scopes which ROW gets written — it does nothing to validate a FK
 * VALUE being written into that row. `query_bookings` and
 * `get_schedule_summary` (same file, same tool dispatch) both embed
 * `team_members!bookings_team_member_id_fkey(name)` off this exact column
 * with no tenant filter on the embedded side — PostgREST resolves the join
 * regardless of which tenant owns the joined row — so an unverified foreign
 * id planted here would surface another tenant's employee name on the very
 * next "who's on the schedule" query. Same exfil class as P1/P11/P25/P30.
 *
 * This is now a regression lock: a model-supplied foreign-tenant
 * team_member_id must be REJECTED, not written.
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-a',
    tenantId: TENANT_A,
    tenant: { id: TENANT_A, name: 'Tenant A', industry: 'cleaning', anthropic_api_key: 'stored-key' },
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
    team_members: [
      { id: 'tm-a', tenant_id: TENANT_A, name: 'Member A' },
      { id: 'tm-b', tenant_id: TENANT_B, name: 'Victim Member B' },
    ],
    bookings: [
      { id: 'booking-a', tenant_id: TENANT_A, status: 'scheduled', team_member_id: 'tm-a' },
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
  createMock.mockReset()
})

function post(messages: unknown[]) {
  return POST(
    new Request('http://t/api/ai/assistant', { method: 'POST', body: JSON.stringify({ messages }) }),
  )
}

function toolTurn(name: string, input: Record<string, unknown>) {
  createMock
    .mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'call-1', name, input }],
    })
    .mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done.' }],
    })
}

describe('ai/assistant update_bookings — foreign team_member_id (BLOCKED)', () => {
  it('BLOCKED: tenant A cannot reassign its own booking to tenant B\'s team_member_id', async () => {
    toolTurn('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { team_member_id: 'tm-b' }, // tenant B's real employee — foreign
      confirmed: true,
    })

    const res = await post([{ role: 'user', content: 'reassign booking-a to member B' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.team_member_id).toBe('tm-a') // unchanged, not overwritten with tm-b
  })

  it('CONTROL: tenant A can reassign its own booking to its own team_member_id', async () => {
    h.seed.team_members.push({ id: 'tm-a2', tenant_id: TENANT_A, name: 'Member A2' })
    toolTurn('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { team_member_id: 'tm-a2' },
      confirmed: true,
    })

    const res = await post([{ role: 'user', content: 'reassign booking-a to member A2' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.team_member_id).toBe('tm-a2')
  })

  it('CONTROL: updates without team_member_id (e.g. status change) still apply', async () => {
    toolTurn('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { status: 'confirmed' },
      confirmed: true,
    })

    const res = await post([{ role: 'user', content: 'confirm booking-a' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.status).toBe('confirmed')
  })
})

/**
 * Mass-assignment gap (same class as P7/P8 in the leak register): `updates`
 * on `update_bookings`/`update_client` is a model-supplied object that was
 * spread verbatim into `.update()` with no column allow-list. The
 * `.eq('tenant_id', …)` WHERE clause only scopes which ROW is written — a
 * `tenant_id` key inside `updates` could still overwrite the row's own
 * tenant_id, donating it to another tenant, exactly like the already-fixed
 * `PUT /api/finance/expenses/[id]` (P7) and `PUT /api/schedules/[id]` (P8).
 * Both tools now allow-list mutable columns, matching their own documented
 * tool schema and src/lib/selena/tools.ts's handleUpdateBooking.
 */
describe('ai/assistant mass-assignment — tenant_id column injection (BLOCKED)', () => {
  it('BLOCKED: update_bookings cannot overwrite tenant_id via the updates object', async () => {
    toolTurn('update_bookings', {
      booking_ids: ['booking-a'],
      updates: { status: 'confirmed', tenant_id: TENANT_B },
      confirmed: true,
    })

    const res = await post([{ role: 'user', content: 'confirm booking-a' }])
    expect(res.status).toBe(200)

    const booking = h.seed.bookings.find((b) => b.id === 'booking-a')
    expect(booking!.tenant_id).toBe(TENANT_A) // not donated to tenant B
    expect(booking!.status).toBe('confirmed') // allowed field still applied
  })

  it('BLOCKED: update_client cannot overwrite tenant_id via the updates object', async () => {
    toolTurn('update_client', {
      client_id: 'client-a',
      updates: { name: 'Renamed Client', tenant_id: TENANT_B },
    })

    const res = await post([{ role: 'user', content: 'rename client-a' }])
    expect(res.status).toBe(200)

    const client = h.seed.clients.find((c) => c.id === 'client-a')
    expect(client!.tenant_id).toBe(TENANT_A) // not donated to tenant B
    expect(client!.name).toBe('Renamed Client') // allowed field still applied
  })

  it('CONTROL: update_client applies only its documented allow-listed fields', async () => {
    toolTurn('update_client', {
      client_id: 'client-a',
      updates: { phone: '555-0100', notes: 'VIP', not_a_real_column: 'ignored' },
    })

    const res = await post([{ role: 'user', content: 'update client-a phone' }])
    expect(res.status).toBe(200)

    const client = h.seed.clients.find((c) => c.id === 'client-a')
    expect(client!.phone).toBe('555-0100')
    expect(client!.notes).toBe('VIP')
    expect(client!.not_a_real_column).toBeUndefined()
  })
})
