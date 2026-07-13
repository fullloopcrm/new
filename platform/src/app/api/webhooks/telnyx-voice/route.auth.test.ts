/**
 * TELNYX VOICE WEBHOOK AUTH — /api/webhooks/telnyx-voice POST.
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: the route only checked
 * webhook freshness (a timestamp header) and only when TELNYX_PUBLIC_KEY was
 * set — it never verified the Ed25519 signature. A forged event with a
 * current timestamp sailed straight through, and anyone who found this URL
 * could drive the entire call lifecycle (ring admins, bridge, record, hang
 * up) with zero proof of Telnyx origin.
 *
 * This suite proves the new verifyTelnyx() gate actually rejects bad/missing
 * signatures at the route level (not just in the underlying helper), fails
 * CLOSED (blocks, not skips) when TELNYX_PUBLIC_KEY isn't configured — unlike
 * Telegram's fail-open pre-activation gate, because a forged voice event is
 * call-flow takeover, not spam — and can be explicitly disabled via
 * TELNYX_VOICE_WEBHOOK_VERIFY=off for local dev.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        gte: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null }),
  },
}))

vi.mock('@/lib/nycmaid/sms', () => ({
  sendSMS: vi.fn(async () => ({ ok: true })),
}))

const ORIGINAL_ENV = { ...process.env }

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const RAW_PUB = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

function signedReq(body: string, opts: { sign?: boolean; badSig?: boolean } = {}): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.sign) {
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = opts.badSig
      ? Buffer.from('not-a-real-signature').toString('base64')
      : cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
    headers['telnyx-timestamp'] = ts
    headers['telnyx-signature-ed25519'] = sig
  }
  return new Request('https://example.com/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers,
    body,
  })
}

const UNMATCHED_EVENT = JSON.stringify({ data: { event_type: 'call.speak.ended', payload: {} } })

describe('POST /api/webhooks/telnyx-voice — signature gate', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('rejects a forged event with a bad signature when TELNYX_PUBLIC_KEY is configured', async () => {
    process.env.TELNYX_PUBLIC_KEY = RAW_PUB
    const { POST } = await import('./route')

    const res = await POST(signedReq(UNMATCHED_EVENT, { sign: true, badSig: true }) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('rejects an event with no signature headers at all when configured', async () => {
    process.env.TELNYX_PUBLIC_KEY = RAW_PUB
    const { POST } = await import('./route')

    const res = await POST(signedReq(UNMATCHED_EVENT) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('fails CLOSED (401) when TELNYX_PUBLIC_KEY is not configured and verification is not disabled', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    delete process.env.TELNYX_VOICE_WEBHOOK_VERIFY
    const { POST } = await import('./route')

    const res = await POST(signedReq(UNMATCHED_EVENT) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('accepts a validly signed event when TELNYX_PUBLIC_KEY is configured', async () => {
    process.env.TELNYX_PUBLIC_KEY = RAW_PUB
    const { POST } = await import('./route')

    const res = await POST(signedReq(UNMATCHED_EVENT, { sign: true }) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
  })

  it('bypasses the gate when TELNYX_VOICE_WEBHOOK_VERIFY=off (explicit local-dev opt-out)', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
    const { POST } = await import('./route')

    const res = await POST(signedReq(UNMATCHED_EVENT) as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
  })
})
