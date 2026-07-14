import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the F-4 read-path fix (a3233e97).
 *
 * Fix a3233e97 added a client-ownership gate to the two READ handlers that
 * 017043f left behind — handleResendConfirmation + handleBookingDetails. A
 * caller-supplied booking_id belonging to another client in the SAME tenant
 * used to leak that booking's details / resend a confirmation disclosing the
 * victim's email.
 *
 * The fix's own suite (booking-authz.test.ts) asserts the reject error code and
 * that sendEmail is not called. This independently-authored suite locks THREE
 * properties that sibling does NOT assert:
 *
 *   1. NO PARTIAL DISCLOSURE — on a same-tenant cross-client reject, the raw
 *      tool-result string contains NONE of the victim's fields (name, address,
 *      GPS, email). The sibling checks `parsed.error` but never inspects the
 *      payload for leaked victim data.
 *
 *   2. IDENTITY COMES FROM THE CONVERSATION, NOT CALLER INPUT — the EXACT same
 *      booking row flips allow<->deny purely by changing the conversation's
 *      client_id. That proves the ownership check keys on the authenticated
 *      conversation (sms_conversations.client_id), never on anything the caller
 *      supplied. This is the structural invariant behind the fix.
 *
 *   3. SCOPED READ — the ownership fetch itself carried tenant_id = the
 *      conversation's tenant (a query-scoped read, not a post-filter).
 *
 * Mock strategy is deliberately independent: a builder recording every SELECT's
 * eq-filters, plus sendEmail call capture, so a rejected request can be asserted
 * to have (a) leaked nothing and (b) sent nothing.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let selectCalls: Array<{ table: string; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: () => chain,
    insert: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    maybeSingle: async () => { selectCalls.push({ table, eqs: { ...eqs } }); return selectResolver(table, eqs) },
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(onF, onR),
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))

// Capture every email send. A rejected read must send NOTHING.
const emailMock = vi.hoisted(() => ({ calls: [] as Array<{ to: string; subject: string }> }))
vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: async (to: string, subject: string) => { emailMock.calls.push({ to, subject }) },
}))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
// booking_details dynamically imports this only AFTER the ownership gate passes.
vi.mock('@/lib/client-properties', () => ({ applyPropertyToBookingClient: () => {} }))

import { handleTool, EMPTY_CHECKLIST, type YinezResult as CoreResult } from '@/lib/selena/core'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CLIENT_A = 'client-A'
const VICTIM = 'client-VICTIM'
const VICTIM_NAME = 'Victoria Victim'
const VICTIM_ADDRESS = '742 Evergreen Terrace, Springfield'
const VICTIM_EMAIL = 'victoria.victim@example.com'
const VICTIM_GPS = '40.712345, -74.006789'

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })
const bookingsSelect = () => selectCalls.filter((c) => c.table === 'bookings')

beforeEach(() => {
  selectCalls = []
  emailMock.calls = []
  selectResolver = () => ({ data: null, error: null })
})
afterEach(() => vi.unstubAllEnvs())

// ── booking_details: no partial disclosure of a same-tenant victim ──────────

describe('W4 F-4: booking_details cross-client reject leaks no victim data', () => {
  it('a same-tenant booking owned by another client returns not_your_booking with ZERO victim fields in the payload', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return {
        data: {
          id: 'bk-victim', client_id: VICTIM, tenant_id: TENANT_A,
          start_time: '2099-01-01T10:00:00', end_time: null,
          check_in_location: JSON.stringify({ latitude: 40.712345, longitude: -74.006789 }),
          hourly_rate: 69, status: 'completed', service_type: 'regular',
          clients: { name: VICTIM_NAME, address: VICTIM_ADDRESS }, cleaners: { name: 'Cleaner X' },
        },
        error: null,
      }
      return { data: null, error: null }
    }

    const out = await handleTool('booking_details', { booking_id: 'bk-victim' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    // No fragment of the victim's row may appear anywhere in the tool result.
    expect(out).not.toContain(VICTIM_NAME)
    expect(out).not.toContain(VICTIM_ADDRESS)
    expect(out).not.toContain(VICTIM_GPS)
    expect(out).not.toContain('40.712345')
    // The read that fetched the row was scoped to the caller's own tenant.
    expect(bookingsSelect().length).toBeGreaterThan(0)
    for (const c of bookingsSelect()) expect(c.eqs.tenant_id).toBe(TENANT_A)
  })
})

// ── resend_confirmation: victim email is neither sent nor echoed ────────────

describe('W4 F-4: resend_confirmation cross-client reject discloses no email', () => {
  it("a same-tenant victim booking_id sends no email and never echoes the victim's address in the result", async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return {
        data: {
          client_id: VICTIM, start_time: '2099-01-01T10:00:00', service_type: 'regular', hourly_rate: 69,
          clients: { name: VICTIM_NAME, email: VICTIM_EMAIL, pin: '4242' }, cleaners: { name: 'Cleaner X' },
        },
        error: null,
      }
      return { data: null, error: null }
    }

    const out = await handleTool('resend_confirmation', { booking_id: 'bk-victim' }, 'convo-A', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
    expect(emailMock.calls).toHaveLength(0)
    expect(out).not.toContain(VICTIM_EMAIL)
  })
})

// ── Ownership identity is the conversation, not caller input ─────────────────

describe('W4 F-4: the ownership gate keys on the conversation, not the request', () => {
  // The booking row and the caller-supplied booking_id are held constant; only
  // the conversation's own client_id changes. The SAME booking must be denied to
  // a stranger and allowed to its owner — proving the identity is conversation-
  // derived, not read off anything the caller controls.
  const ownBooking = () => ({
    id: 'bk-1', client_id: CLIENT_A, tenant_id: TENANT_A,
    start_time: '2099-01-01T10:00:00', end_time: null, check_in_location: null,
    hourly_rate: 69, status: 'completed', service_type: 'regular',
    clients: { name: 'Real Client', address: '1 Main St' }, cleaners: { name: 'Cleaner X' },
  })

  it('DENIES when the conversation belongs to a different client than the booking', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: VICTIM, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: ownBooking(), error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-1' }, 'convo', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('not_your_booking')
  })

  it('ALLOWS the identical booking + booking_id once the conversation IS that client', async () => {
    selectResolver = (table) => {
      if (table === 'sms_conversations') return { data: { client_id: CLIENT_A, tenant_id: TENANT_A }, error: null }
      if (table === 'bookings') return { data: ownBooking(), error: null }
      return { data: null, error: null }
    }
    const out = await handleTool('booking_details', { booking_id: 'bk-1' }, 'convo', coreResult(), TENANT_A)
    expect(JSON.parse(out).error).toBeUndefined()
    expect(JSON.parse(out).booking_id).toBe('bk-1')
  })
})
