import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * clients.phone and team_members.phone have no uniqueness constraint
 * (idx_clients_tenant_phone is a plain index — this codebase has repeatedly
 * needed *_dedup migrations for duplicate rows, so duplicate phones are a
 * demonstrated shape, not hypothetical). Every phone lookup in this route
 * used `.eq('phone', from).single()` directly — `.single()` errors when 2+
 * rows match, and since none of the call sites checked the error, a
 * duplicate phone silently nulled the result. STOP/START/YES/rating replies
 * from a client with any duplicate phone row did nothing at all: consent
 * flags never flipped, bookings never confirmed. Same failure class this
 * file's own tenant lookup was already fixed for (a mis-seeded row took SMS
 * down during a cutover test) — this fix (findByPhone helper, limit(2)
 * instead of single()) applies that same tolerance to every client/
 * team_members phone lookup in the file.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-01-01T00:00:00' }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const DUPE_PHONE = '+15551234567'

function inboundSms(text: string) {
  const body = JSON.stringify({
    data: {
      event_type: 'message.received',
      payload: {
        from: { phone_number: DUPE_PHONE },
        to: [{ phone_number: '+18005551000' }],
        text,
      },
    },
  })
  return new Request('http://x/api/webhooks/telnyx', { method: 'POST', body })
}

beforeEach(() => {
  process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({
    tenants: [
      { id: TENANT_ID, name: 'Acme', telnyx_phone: '+18005551000', telnyx_api_key: 'key', owner_phone: null },
    ],
    // Two clients sharing the same phone in the same tenant — a duplicate
    // data-entry row, not a schema violation (no unique constraint exists).
    clients: [
      { id: 'client-1', tenant_id: TENANT_ID, name: 'First Client', phone: DUPE_PHONE, sms_consent: true, notes: null },
      { id: 'client-2', tenant_id: TENANT_ID, name: 'Duplicate Client', phone: DUPE_PHONE, sms_consent: true, notes: null },
    ],
    team_members: [],
    client_contacts: [],
  })
})

describe('POST /api/webhooks/telnyx — duplicate clients.phone rows', () => {
  it('STOP still revokes sms_consent when two clients share the inbound phone', async () => {
    await POST(inboundSms('STOP') as unknown as Parameters<typeof POST>[0])

    const rows = h.fake!._all('clients')
    // Whichever row findByPhone picks (deterministic — lowest id), consent
    // must actually flip. Before the fix, .single() errored on the 2-row
    // match and the whole STOP handler silently no-opped: neither row
    // changed.
    const flipped = rows.filter((r) => r.sms_consent === false)
    expect(flipped.length).toBeGreaterThan(0)
  })

  it('YES/CONFIRM still resolves a client when two clients share the inbound phone', async () => {
    h.fake!._store.set('bookings', [
      {
        id: 'booking-1', tenant_id: TENANT_ID, client_id: 'client-1',
        status: 'scheduled', start_time: '2099-01-01T00:00:00', notes: null,
      },
    ])

    const res = await POST(inboundSms('YES') as unknown as Parameters<typeof POST>[0])
    const json = await res.json()

    // Before the fix, .single() on the duplicate-phone lookup errored, the
    // client resolved to null, and the handler fell straight through to the
    // "team member confirming" branch — returning the generic 200 with no
    // `action: 'confirmed'`, and the booking stayed unconfirmed.
    expect(json.action).toBe('confirmed')
    const booking = h.fake!._all('bookings').find((b) => b.id === 'booking-1')
    expect(booking?.status).toBe('confirmed')
  })
})
