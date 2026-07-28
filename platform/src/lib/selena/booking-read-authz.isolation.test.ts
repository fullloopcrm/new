import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 INDEPENDENT verification lane for the F-4 read-path fix (a3233e97).
 *
 * Fix a3233e97 added a client-ownership gate to the READ handlers that
 * 017043f left behind — handleResendConfirmation + (originally also)
 * handleBookingDetails. A caller-supplied booking_id belonging to another
 * client in the SAME tenant used to leak that booking's details / resend a
 * confirmation disclosing the victim's email.
 *
 * handleBookingDetails and its own coverage here (originally two describe
 * blocks: no-partial-disclosure, and the conversation-vs-caller-input
 * identity proof) were removed 2026-07-28 — the handler was deleted as
 * confirmed-dead code: `booking_details` was never reachable from any live
 * production caller (not in tools.ts's CLIENT_TOOLS set, not called by the
 * voice channel). The resend_confirmation coverage below is unaffected —
 * that tool IS live via CLIENT_TOOLS.
 *
 * The fix's own suite (booking-authz.test.ts) asserts the reject error code and
 * that sendEmail is not called. This independently-authored suite locks a
 * property that sibling does NOT assert: victim email is never echoed back
 * in the raw tool-result string, not just absent from sendEmail's args.
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
const VICTIM_EMAIL = 'victoria.victim@example.com'

const coreResult = (): CoreResult => ({ text: '', checklist: EMPTY_CHECKLIST })

beforeEach(() => {
  selectCalls = []
  emailMock.calls = []
  selectResolver = () => ({ data: null, error: null })
})
afterEach(() => vi.unstubAllEnvs())

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
