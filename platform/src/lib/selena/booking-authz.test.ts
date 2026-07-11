import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Cross-tenant / cross-client authorization boundary for booking mutations
 * (reschedule_booking, cancel_booking) and owner tooling (isOwnerOfTenant +
 * the runTool owner gate).
 *
 * The bug these tests lock down: handleRescheduleBooking/handleCancelBooking
 * used to fetch a booking by id ALONE and derive the tenant from the fetched
 * row. A client in tenant A could therefore reschedule/cancel tenant B's
 * booking by supplying B's booking_id. And isOwner() checked one global
 * OWNER_PHONES list, so the owner of tenant A was an "owner" of every tenant.
 *
 * Mock strategy: a tiny Supabase query builder whose .single()/.maybeSingle()
 * result is decided by a per-test resolver keyed on (table, eq-filters), and
 * whose .update(...).eq().eq() awaited chain records the mutation so we can
 * assert NO write happened on a rejected request.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let updateCalls: Array<{ table: string; values: Record<string, unknown>; eqs: Eqs }>
let insertCalls: Array<{ table: string; values: unknown }>

function builder(table: string) {
  const eqs: Eqs = {}
  let updateValues: Record<string, unknown> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: (values: Record<string, unknown>) => {
      updateValues = values
      return chain
    },
    insert: (values: unknown) => {
      insertCalls.push({ table, values })
      return chain
    },
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    ilike: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    maybeSingle: async () => selectResolver(table, eqs),
    // Awaiting the chain itself (the `await ...update().eq().eq()` path) resolves
    // here. Selects never hit this because they terminate in .single().
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (updateValues !== null) {
        updateCalls.push({ table, values: updateValues, eqs: { ...eqs } })
      }
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

// Cancel notifies operators; stub it so no real side effect fires in tests.
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

// resend_confirmation sends an email on the ALLOW path. Track the calls so a
// rejected cross-client read can be asserted to send NOTHING, and stub the
// template so no real mail leaves the process.
const emailMock = vi.hoisted(() => ({ calls: [] as Array<{ to: string; subject: string }> }))
vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: async (to: string, subject: string) => { emailMock.calls.push({ to, subject }) },
}))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
// booking_details dynamically imports this only AFTER the ownership gate passes;
// stub it so the ALLOW path stays a pure read.
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'
import { isOwnerOfTenant, type YinezResult } from '@/lib/selena/agent'
import { runTool } from '@/lib/selena/tools'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const NYCMAID = '00000000-0000-0000-0000-000000000001'

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })
const agentResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  updateCalls = []
  insertCalls = []
  emailMock.calls = []
  selectResolver = () => ({ data: null, error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ── reschedule_booking / cancel_booking cross-tenant + cross-client ──────────

describe('handleRescheduleBooking — tenant/client authorization', () => {
  it('REJECTS a booking_id that belongs to another tenant (no write)', async () => {
    // Caller conversation is in tenant A. The booking_id they supply belongs to
    // tenant B. The scoped fetch (id + tenant_id=A) must resolve to nothing.
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        // Only tenant B owns this booking — a fetch scoped to tenant A misses.
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', tenant_id: TENANT_B, client_id: 'client-B', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00' }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }

    const out = await handleTool('reschedule_booking', { booking_id: 'bk-B', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('Booking not found')
    expect(updateCalls).toHaveLength(0)
  })

  it("REJECTS a same-tenant booking owned by a different client (no write)", async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-1', tenant_id: TENANT_A, client_id: 'client-OTHER', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00' }, error: null }
      return { data: null, error: null }
    }

    const out = await handleTool('reschedule_booking', { booking_id: 'bk-1', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('REJECTS when the conversation has no client account (no write)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: null, tenant_id: TENANT_A }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('reschedule_booking', { booking_id: 'bk-1', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('no_account')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS the owning client to reschedule their own recurring booking (writes, tenant-scoped)', async () => {
    const future = new Date(Date.now() + 30 * 864e5).toISOString()
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-1', tenant_id: TENANT_A, client_id: 'client-A', recurring_type: 'weekly', start_time: future }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('reschedule_booking', { booking_id: 'bk-1', new_date: '2099-02-01', new_time: '2:00 PM' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
    // The write must be scoped to the caller's tenant, not a row-derived tenant.
    expect(updateCalls[0].eqs.tenant_id).toBe(TENANT_A)
    expect(updateCalls[0].eqs.id).toBe('bk-1')
  })
})

describe('handleCancelBooking — tenant/client authorization', () => {
  it('REJECTS a booking_id that belongs to another tenant (no write)', async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', tenant_id: TENANT_B, client_id: 'client-B', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00', clients: { name: 'Victim' } }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('cancel_booking', { booking_id: 'bk-B', reason: 'x' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('REJECTS a same-tenant booking owned by a different client (no write)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-1', tenant_id: TENANT_A, client_id: 'client-OTHER', recurring_type: 'weekly', start_time: '2099-01-01T10:00:00', clients: { name: 'Victim' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('cancel_booking', { booking_id: 'bk-1', reason: 'x' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS the owning client to cancel their own recurring booking (writes, tenant-scoped)', async () => {
    const future = new Date(Date.now() + 30 * 864e5).toISOString()
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-1', tenant_id: TENANT_A, client_id: 'client-A', recurring_type: 'weekly', start_time: future, clients: { name: 'Real Client' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('cancel_booking', { booking_id: 'bk-1', reason: 'x' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].eqs.tenant_id).toBe(TENANT_A)
    expect(updateCalls[0].values.status).toBe('cancelled')
  })
})

// ── resend_confirmation / booking_details cross-client READ (F-4) ────────────
//
// These two handlers fetched a booking by (id + tenant_id) but never checked
// client ownership. A caller in tenant A could supply another client's
// booking_id from the SAME tenant and read that booking's details, or trigger a
// confirmation email — an intra-tenant cross-client read. The fix adds the same
// client-ownership gate used by reschedule/cancel.

describe('handleResendConfirmation — client-ownership (F-4)', () => {
  it('REJECTS a same-tenant booking owned by a different client (no email sent)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { client_id: 'client-OTHER', start_time: '2099-01-01T10:00:00', service_type: 'standard', hourly_rate: 69, clients: { name: 'Victim', email: 'victim@example.com', pin: '1234' }, cleaners: { name: 'Cleaner' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('resend_confirmation', { booking_id: 'bk-OTHER' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    // The victim's confirmation email must NOT have been sent.
    expect(emailMock.calls).toHaveLength(0)
  })

  it("REJECTS a booking_id from another tenant (scoped fetch misses; no email)", async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        if (eqs.tenant_id === TENANT_B) return { data: { client_id: 'client-B', start_time: '2099-01-01T10:00:00', service_type: 'standard', hourly_rate: 69, clients: { name: 'B', email: 'b@example.com', pin: '9' }, cleaners: { name: 'C' } }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('resend_confirmation', { booking_id: 'bk-B' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
    expect(emailMock.calls).toHaveLength(0)
  })

  it('ALLOWS the owning client to resend their own confirmation (email sent to their address)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { client_id: 'client-A', start_time: '2099-01-01T10:00:00', service_type: 'standard', hourly_rate: 69, clients: { name: 'Real', email: 'real@example.com', pin: '1234' }, cleaners: { name: 'Cleaner' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('resend_confirmation', { booking_id: 'bk-A' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).success).toBe(true)
    expect(emailMock.calls).toHaveLength(1)
    expect(emailMock.calls[0].to).toBe('real@example.com')
  })
})

describe('handleBookingDetails — client-ownership (F-4)', () => {
  it('REJECTS a same-tenant booking owned by a different client (no details leaked)', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-OTHER', client_id: 'client-OTHER', tenant_id: TENANT_A, start_time: '2099-01-01T10:00:00', service_type: 'standard', status: 'completed', clients: { name: 'Victim', address: '123 Secret St' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-OTHER' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('not_your_booking')
    // No victim data should appear in the rejected response.
    expect(out).not.toContain('123 Secret St')
    expect(parsed.client_address).toBeUndefined()
  })

  it("REJECTS a booking_id from another tenant (scoped fetch misses)", async () => {
    selectResolver = (table, eqs) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') {
        if (eqs.tenant_id === TENANT_B) return { data: { id: 'bk-B', client_id: 'client-B', tenant_id: TENANT_B, start_time: '2099-01-01T10:00:00', status: 'completed', clients: { name: 'B', address: 'B St' } }, error: null }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-B' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('Booking not found')
  })

  it('ALLOWS the owning client to read their own booking details', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: 'client-A', tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: { id: 'bk-A', client_id: 'client-A', tenant_id: TENANT_A, start_time: '2099-01-01T10:00:00', service_type: 'standard', status: 'completed', hourly_rate: 69, clients: { name: 'Real', address: '1 My Rd' }, cleaners: { name: 'Cleaner' } }, error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-A' }, 'convo-A', coreResult(), TENANT_A)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBeUndefined()
    expect(parsed.booking_id).toBe('bk-A')
  })
})

// ── isOwnerOfTenant — per-tenant owner identity ─────────────────────────────

describe('isOwnerOfTenant — owner identity is per-tenant', () => {
  const ownerRow = (phone: string | null) => (table: string) =>
    table === 'tenants' ? { data: { owner_phone: phone }, error: null } : { data: null, error: null }

  it("recognizes a tenant's own owner_phone", async () => {
    selectResolver = ownerRow('+1 (212) 555-1111')
    expect(await isOwnerOfTenant('212-555-1111', TENANT_A)).toBe(true)
  })

  it("REJECTS the owner of tenant A when acting on tenant B (cross-tenant owner escalation)", async () => {
    // Tenant B's owner_phone is a DIFFERENT number. Tenant A's owner's phone
    // must NOT be treated as an owner of tenant B.
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-2222' }, error: null } : { data: null, error: null })
    expect(await isOwnerOfTenant('212-555-1111', TENANT_B)).toBe(false)
  })

  it('does NOT consult the global OWNER_PHONES env for a non-nycmaid tenant', async () => {
    vi.stubEnv('OWNER_PHONES', '212-555-1111')
    selectResolver = ownerRow(null) // tenant B has no owner_phone set
    expect(await isOwnerOfTenant('212-555-1111', TENANT_B)).toBe(false)
  })

  it('honors the legacy OWNER_PHONES env ONLY for the nycmaid tenant', async () => {
    vi.stubEnv('OWNER_PHONES', '212-555-1111')
    selectResolver = ownerRow(null) // no owner_phone row → falls back to legacy env
    expect(await isOwnerOfTenant('212-555-1111', NYCMAID)).toBe(true)
  })

  it('returns false for an empty/absent phone', async () => {
    selectResolver = ownerRow('212-555-1111')
    expect(await isOwnerOfTenant(null, TENANT_A)).toBe(false)
    expect(await isOwnerOfTenant('', TENANT_A)).toBe(false)
  })
})

// ── runTool owner gate — cross-tenant owner tooling ─────────────────────────

describe('runTool owner gate — owner tooling is per-tenant', () => {
  const FAKE_OWNER_TOOL = '__nonexistent_owner_tool__'

  it('REJECTS owner-of-tenant-A calling an owner tool scoped to tenant B', async () => {
    // Every tenants lookup here returns tenant B's owner_phone (a different
    // number), so tenant A's owner phone is not an owner of B.
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-2222' }, error: null } : { data: null, error: null })
    const out = await runTool(FAKE_OWNER_TOOL, {}, 'convo-B', '212-555-1111', agentResult(), TENANT_B)
    expect(JSON.parse(out).error).toBe('owner_only_tool')
  })

  it('REJECTS a plain client calling an owner tool', async () => {
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-9999' }, error: null } : { data: null, error: null })
    const out = await runTool(FAKE_OWNER_TOOL, {}, 'convo-A', '212-555-1111', agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('owner_only_tool')
  })

  it("ALLOWS the tenant's own owner through the gate", async () => {
    selectResolver = (table) => (table === 'tenants' ? { data: { owner_phone: '212-555-1111' }, error: null } : { data: null, error: null })
    const out = await runTool(FAKE_OWNER_TOOL, {}, 'convo-A', '212-555-1111', agentResult(), TENANT_A)
    const parsed = JSON.parse(out)
    // Gate passed (not blocked); the fake tool then falls through to "unknown tool".
    expect(parsed.error).not.toBe('owner_only_tool')
    expect(String(parsed.error)).toContain('unknown tool')
  })
})
