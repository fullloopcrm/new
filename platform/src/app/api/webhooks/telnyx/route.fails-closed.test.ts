import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

/**
 * /api/webhooks/telnyx (inbound SMS + delivery status) already wires up
 * verifyTelnyx behind TELNYX_WEBHOOK_VERIFY !== 'off', but had no test proving
 * it actually fails closed — a forged/missing signature would otherwise sail
 * straight through into SMS opt-out/opt-in, booking confirmation, and chatbot
 * booking-creation logic. Same fail-closed contract already locked in for
 * telnyx-voice (route.signature-verification.test.ts).
 */

const supabaseFrom = vi.fn((..._args: unknown[]) => ({
  select: () => ({
    eq: () => ({
      single: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data: null, error: null }) }),
    }),
  }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  insert: () => Promise.resolve({ data: null, error: null }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn() }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn() }))

function req(opts: { rawBody: string; signature?: string | null; timestamp?: string | null }): Request {
  return {
    text: async () => opts.rawBody,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase()
        if (key === 'telnyx-signature-ed25519') return opts.signature ?? null
        if (key === 'telnyx-timestamp') return opts.timestamp ?? null
        return null
      },
    },
  } as unknown as Request
}

describe('telnyx (SMS) webhook — fails closed on missing/invalid signature', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPub = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

  function sign(ts: string, body: string): string {
    return cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
  }

  // Delivery-status event with no matching message id — smallest branch,
  // exercises verification without needing to mock the full inbound-SMS path.
  const deliveryStatusBody = JSON.stringify({ data: { event_type: 'message.sent', payload: {} } })

  beforeEach(() => {
    vi.resetModules()
    supabaseFrom.mockClear()
    process.env.TELNYX_PUBLIC_KEY = rawPub
    delete process.env.TELNYX_WEBHOOK_VERIFY
  })

  it('rejects a forged signature (wrong keypair) — fails closed, never processes the event', async () => {
    const { POST } = await import('./route')
    const ts = Math.floor(Date.now() / 1000).toString()
    const { privateKey: attackerKey } = generateKeyPairSync('ed25519')
    const forgedSig = cryptoSign(null, Buffer.from(`${ts}|${deliveryStatusBody}`, 'utf8'), attackerKey).toString('base64')

    const res = await POST(req({ rawBody: deliveryStatusBody, signature: forgedSig, timestamp: ts }))

    expect(res.status).toBe(401)
  })

  it('rejects a tampered body under a signature signed for a different body', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const originalBody = JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: '+15550001111' }, to: [{ phone_number: '+15559990000' }], text: 'hi' } } })
    const sig = sign(ts, originalBody)
    const tamperedBody = JSON.stringify({ data: { event_type: 'message.received', payload: { from: { phone_number: '+15559998888' }, to: [{ phone_number: '+15559990000' }], text: 'hi' } } })

    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: tamperedBody, signature: sig, timestamp: ts }))

    expect(res.status).toBe(401)
  })

  it('rejects a missing signature header when a key is configured (fail-closed)', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: deliveryStatusBody, timestamp: Math.floor(Date.now() / 1000).toString() }))

    expect(res.status).toBe(401)
  })

  it('accepts a valid signature and proceeds to process the event', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = sign(ts, deliveryStatusBody)

    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: deliveryStatusBody, signature: sig, timestamp: ts }))

    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it('TELNYX_WEBHOOK_VERIFY=off bypasses verification (explicit local-dev escape hatch)', async () => {
    process.env.TELNYX_WEBHOOK_VERIFY = 'off'
    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: deliveryStatusBody }))

    expect(res.status).toBe(200)
  })

  it('unset TELNYX_PUBLIC_KEY => fails closed too (stricter than telnyx-voice: this route only skips verification via the explicit VERIFY=off escape hatch, not merely by unsetting the key)', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: deliveryStatusBody }))

    expect(res.status).toBe(401)
  })
})
