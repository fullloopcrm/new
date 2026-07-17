import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/bookings/batch — the bulk/recurring-series booking-creation route
 * sends the first row's client a "booking confirmed" SMS directly via the
 * bare `@/lib/sms` wrapper, never checking `clients.sms_consent` — the
 * codebase-wide TCPA convention items (19)/(21)/(23)/(31)/(33) already
 * established for every client-self-service booking path. Proves the fix:
 * sms_consent:false suppresses the send, true/unset still sends.
 */

const holder = vi.hoisted(() => ({
  smsCalls: [] as Array<Record<string, unknown>>,
  clientSmsConsent: true as boolean | null,
}))

const TENANT_ID = 'tid-a'
const CLIENT_A = 'client-a'
const TENANT_ROW = { telnyx_api_key: 'key', telnyx_phone: '+15550000000', resend_api_key: null, email_from: null, name: 'Test Tenant', slug: 't', industry: 'cleaning', phone: null, website_url: null, domain: null, domain_name: null, google_place_id: null }

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async (args: Record<string, unknown>) => { holder.smsCalls.push(args); return {} }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'sms body' }) }))
vi.mock('@/lib/messaging/team-sms-resolver', () => ({ teamSmsTemplates: () => ({ jobAssignment: () => 'team sms' }) }))

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    in: () => c,
    eq: () => c,
    insert: () => c,
    single: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chain({ data: TENANT_ROW, error: null })
      if (table === 'clients') return chain({ data: [{ id: CLIENT_A }], error: null })
      if (table === 'bookings') {
        return chain({
          data: [
            {
              id: 'bk-1',
              start_time: '2026-08-10T10:00:00.000Z',
              status: 'scheduled',
              clients: { name: 'Alice', phone: '+15551234567', email: null, sms_consent: holder.clientSmsConsent },
              team_members: null,
            },
          ],
          error: null,
        })
      }
      return chain({ data: null, error: null })
    },
  },
}))

import { POST } from './route'

function batchReq() {
  return POST(
    new Request('http://x/api/bookings/batch', {
      method: 'POST',
      body: JSON.stringify({
        bookings: [{ client_id: CLIENT_A, start_time: '2026-08-10T10:00:00.000Z', end_time: '2026-08-10T12:00:00.000Z' }],
      }),
    }),
  )
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(() => {
  holder.smsCalls.length = 0
  holder.clientSmsConsent = true
})

describe('POST /api/bookings/batch — booking-confirmation SMS honors sms_consent', () => {
  it('skips the confirmation SMS for a client who has opted out (sms_consent:false)', async () => {
    holder.clientSmsConsent = false
    const res = await batchReq()
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(0)
  })

  it('sends the confirmation SMS for a client who has not opted out (positive control)', async () => {
    holder.clientSmsConsent = true
    const res = await batchReq()
    expect(res.status).toBe(200)
    await flush()
    expect(holder.smsCalls.length).toBe(1)
    expect(holder.smsCalls[0].to).toBe('+15551234567')
  })
})
