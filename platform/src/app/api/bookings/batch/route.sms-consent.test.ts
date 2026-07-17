/**
 * POST /api/bookings/batch — the client booking-confirmation SMS branch (sent
 * for the first row of the batch) called the raw sendSMS() from '@/lib/sms'
 * with no sms_consent check, same consent-bypass bug class as the
 * single-booking sibling POST /api/bookings and notify.ts/cron/confirmations.
 * webhooks/telnyx's STOP handler sets clients.sms_consent=false tenant-wide
 * (a legally-required blanket opt-out) -- this route ignored it, so an
 * opted-out client still got a "Booking confirmed" SMS whenever a recurring
 * schedule expansion (or any batch-create) landed their first row.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  sendSMS: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendSMS: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'bookings') return chain
      // Same join-stitching as the single-booking sibling's
      // route.sms-consent.test.ts: the shared fake's insert doesn't perform
      // real PostgREST joins, so stitch `clients`/`team_members` onto each
      // inserted row from the fake store, matching what
      // `.select('*, clients(*), team_members!...(*)')` returns for real.
      const origThen = chain.then as (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => unknown
      chain.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(origThen((v: unknown) => v)).then((result: unknown) => {
          const r = result as { data: Array<Record<string, unknown>> | null; error: unknown }
          if (r.data) {
            r.data = r.data.map((row) => ({
              ...row,
              clients: (h.store.clients || []).find((c) => c.id === row.client_id) || null,
              team_members: (h.store.team_members || []).find((t) => t.id === row.team_member_id) || null,
            }))
          }
          return res(r)
        }, rej)
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/sms', () => ({ sendSMS: (...a: unknown[]) => h.sendSMS(...a) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: () => 'team sms body' }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'confirmation sms' }),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

const validBody = {
  bookings: [{ client_id: 'client-A1', start_time: '2026-08-01T10:00:00Z', status: 'scheduled' }],
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.sendSMS.mockReset()
  h.sendSMS.mockResolvedValue({ ok: true })
  h.store = {
    bookings: [],
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Pat', phone: '+15550001111', sms_consent: true }],
    team_members: [],
    service_types: [],
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning', telnyx_api_key: 'k', telnyx_phone: '+15550000000', resend_api_key: null, email_from: null }],
  }
})

describe('POST /api/bookings/batch — client confirmation sms_consent gate', () => {
  it('does NOT text a client who opted out (sms_consent:false)', async () => {
    h.store.clients[0].sms_consent = false

    const res = await POST(postReq(validBody))

    expect(res.status).toBe(200)
    expect(h.sendSMS).not.toHaveBeenCalled()
  })

  it('still texts a client with consent (sms_consent:true)', async () => {
    const res = await POST(postReq(validBody))

    expect(res.status).toBe(200)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
    expect(h.sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '+15550001111' }))
  })

  it('still texts a client with no explicit opt-out (sms_consent unset)', async () => {
    h.store.clients[0].sms_consent = undefined

    const res = await POST(postReq(validBody))

    expect(res.status).toBe(200)
    expect(h.sendSMS).toHaveBeenCalledTimes(1)
  })
})
