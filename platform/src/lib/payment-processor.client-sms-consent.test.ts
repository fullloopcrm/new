import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * payment-processor.processPayment()'s client "payment confirmed" SMS never
 * checked clients.sms_consent (the STOP-reply flag) or do_not_service — the
 * team-member finish-up SMS in this SAME function already gated on
 * teamMember.sms_consent (see payment-processor.payout-idempotency.test.ts's
 * fixture, which sets it to false), but the client leg fired unconditionally.
 * A client who texted STOP (clients.sms_consent -> false via the Telnyx
 * webhook) kept getting "Payment confirmed..." texts on every manual
 * (Zelle/Venmo/cash) payment confirmation forever — the exact invariant
 * getClientContacts() enforces for the nycmaid-legacy fan-out was silently
 * absent here.
 */

const TENANT: { id: string; name: string; stripe_api_key: null; telnyx_api_key: string; telnyx_phone: string } = {
  id: 'tenant_1',
  name: 'Test Tenant',
  stripe_api_key: null,
  telnyx_api_key: 'key_x',
  telnyx_phone: '+15550001111',
}

const BOOKING_ID = 'book_consent_1'
const CLIENT_PHONE = '+15559998888'

let clientConsentRow: { phone: string | null; sms_consent: boolean | null; do_not_service: boolean | null }

function bookingsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: {
        id: BOOKING_ID,
        team_member_id: 'tm_1',
        client_id: 'client_1',
        team_member_pay: null,
        actual_hours: 2,
        hourly_rate: 69,
        pay_rate: null,
        price: null,
        check_in_time: null,
        start_time: null,
        clients: { name: 'Client', phone: CLIENT_PHONE, address: null },
        team_members: {
          name: 'Cleaner', phone: null, sms_consent: false, // team-member leg intentionally silenced so only the client leg is under test
          stripe_account_id: null, hourly_rate: null, pay_rate: 25,
          preferred_language: 'en',
        },
      },
      error: null,
    }),
    update: () => chain,
  }
  return chain
}

function clientsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: clientConsentRow, error: null }),
  }
  return chain
}

function paymentsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    insert: () => chain,
    single: async () => ({ data: { id: 'pay_x' }, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'bookings') return bookingsBuilder()
      if (table === 'clients') return clientsBuilder()
      if (table === 'payments') return paymentsBuilder()
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: 'row_x' }, error: null }),
      }
      return noop
    },
  },
}))

const { sendSMS } = vi.hoisted(() => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/finance/post-labor', () => ({ postPayoutToLedger: vi.fn(async () => ({ posted: true })) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/cleaner-pay', () => ({ effectiveCleanerRate: (rate: number) => rate }))

import { processPayment } from './payment-processor'

beforeEach(() => {
  sendSMS.mockClear()
})

describe('payment-processor — client confirmation SMS respects sms_consent / do_not_service', () => {
  it('BLOCKED: sms_consent=false — no client SMS is sent', async () => {
    clientConsentRow = { phone: CLIENT_PHONE, sms_consent: false, do_not_service: false }
    const result = await processPayment({
      tenant: TENANT, bookingId: BOOKING_ID, clientId: 'client_1',
      method: 'zelle', amountCents: 13800, referenceId: 'ref_blocked',
    })
    expect(result?.status).toBe('paid')
    expect(sendSMS).not.toHaveBeenCalledWith(expect.objectContaining({ to: CLIENT_PHONE }))
  })

  it('BLOCKED: do_not_service=true — no client SMS is sent even with consent true', async () => {
    clientConsentRow = { phone: CLIENT_PHONE, sms_consent: true, do_not_service: true }
    const result = await processPayment({
      tenant: TENANT, bookingId: BOOKING_ID, clientId: 'client_1',
      method: 'zelle', amountCents: 13800, referenceId: 'ref_dns',
    })
    expect(result?.status).toBe('paid')
    expect(sendSMS).not.toHaveBeenCalledWith(expect.objectContaining({ to: CLIENT_PHONE }))
  })

  it('CONTROL: sms_consent=true, do_not_service=false — client SMS is sent', async () => {
    clientConsentRow = { phone: CLIENT_PHONE, sms_consent: true, do_not_service: false }
    const result = await processPayment({
      tenant: TENANT, bookingId: BOOKING_ID, clientId: 'client_1',
      method: 'zelle', amountCents: 13800, referenceId: 'ref_ok',
    })
    expect(result?.status).toBe('paid')
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: CLIENT_PHONE }))
  })

  it('CONTROL: sms_consent=null (never explicitly revoked) defaults to allowed, matching the codebase-wide opt-out model', async () => {
    clientConsentRow = { phone: CLIENT_PHONE, sms_consent: null, do_not_service: false }
    const result = await processPayment({
      tenant: TENANT, bookingId: BOOKING_ID, clientId: 'client_1',
      method: 'zelle', amountCents: 13800, referenceId: 'ref_null',
    })
    expect(result?.status).toBe('paid')
    expect(sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: CLIENT_PHONE }))
  })
})
