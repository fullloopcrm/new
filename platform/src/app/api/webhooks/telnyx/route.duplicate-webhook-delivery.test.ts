import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Telnyx redelivers a webhook up to 3x per URL when the endpoint doesn't
 * respond 2xx quickly (documented at-least-once delivery). This route's
 * message.received branch had no dedup key on the Telnyx event id
 * (data.id) -- a redelivery re-ran the entire pipeline, including a
 * second outbound sendSMS to the real client (STOP/START confirmation
 * here). Fix: insert-first-claim on telnyx_webhook_events(event_id),
 * 23505 on the claim short-circuits as an idempotent no-op before any
 * side effect.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
const sendSMS = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn().mockResolvedValue({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: () => '2026-01-01T00:00:00' }))

import { POST } from './route'

const TENANT_ID = 'tenant-1'
const PHONE = '+15551234567'
const EVENT_ID = 'evt-abc-123'

function inboundSms(text: string, eventId: string | undefined) {
  const body = JSON.stringify({
    data: {
      event_type: 'message.received',
      ...(eventId ? { id: eventId } : {}),
      payload: {
        from: { phone_number: PHONE },
        to: [{ phone_number: '+18005551000' }],
        text,
      },
    },
  })
  return new Request('http://x/api/webhooks/telnyx', { method: 'POST', body })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TELNYX_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({
    tenants: [
      { id: TENANT_ID, name: 'Acme', telnyx_phone: '+18005551000', telnyx_api_key: 'key', owner_phone: null },
    ],
    clients: [
      { id: 'client-1', tenant_id: TENANT_ID, name: 'Client One', phone: PHONE, sms_consent: true, notes: null },
    ],
    team_members: [],
    client_contacts: [],
  })
  h.fake!._addUniqueConstraint('telnyx_webhook_events', 'event_id')
})

describe('POST /api/webhooks/telnyx — redelivered event dedup', () => {
  it('a redelivered event (same data.id) does not re-send the outbound SMS', async () => {
    const first = await POST(inboundSms('STOP', EVENT_ID) as unknown as Parameters<typeof POST>[0])
    expect((await first.json()).action).toBe('opt_out')
    expect(sendSMS).toHaveBeenCalledTimes(1)

    const redelivery = await POST(inboundSms('STOP', EVENT_ID) as unknown as Parameters<typeof POST>[0])
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    // The real bug: without the claim, this second call would flip
    // sms_consent's already-false value again (harmless) but ALSO send a
    // second confirmation SMS to the real client -- assert it didn't.
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('two different event ids for the same phone both process normally', async () => {
    await POST(inboundSms('STOP', 'evt-1') as unknown as Parameters<typeof POST>[0])
    await POST(inboundSms('START', 'evt-2') as unknown as Parameters<typeof POST>[0])

    expect(sendSMS).toHaveBeenCalledTimes(2)
  })

  it('an event with no data.id (malformed/legacy payload) still processes -- dedup is best-effort, not a hard requirement', async () => {
    const res = await POST(inboundSms('STOP', undefined) as unknown as Parameters<typeof POST>[0])
    expect((await res.json()).action).toBe('opt_out')
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
