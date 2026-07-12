import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from 'node:crypto'

/**
 * W4 independent isolation regression for the Telnyx inbound-SMS webhook
 * (src/app/api/webhooks/telnyx/route.ts).
 *
 * Unlike the VOICE webhook — which has both route.test.ts and
 * route.isolation.test.ts — the SMS webhook had NO test at all. Its POST handler
 * is the ingress for every inbound customer text (opt-in/out, booking replies,
 * ratings, chatbot). It fails closed on a bad signature (401) before it ever
 * parses the body. This file proves that gate is real and NON-VACUOUS:
 *
 *   - ABSENT signature      → 401 (no telnyx-signature/timestamp headers)
 *   - GARBAGE signature     → 401 (well-formed headers, junk sig)
 *   - TAMPERED body         → 401 (valid sig over a DIFFERENT body)
 *   - FOREIGN-KEY signature → 401 (a genuinely valid Ed25519 sig, but from a
 *                              keypair that is NOT the configured TELNYX_PUBLIC_KEY
 *                              — a different/foreign signer must not be trusted)
 *   - VALID signature       → 200 (the paired control: the SAME payload the 401
 *                              cases send, signed correctly, is accepted — so the
 *                              rejections are the signature check firing, not the
 *                              route rejecting everything)
 *
 * Every case sends the identical event body; only the signature differs, so the
 * 200 control makes the four 401s non-vacuous.
 */

// Chainable, resolve-to-null Supabase stub. The message.sent status path only
// touches supabaseAdmin (update notifications; look up a campaign recipient that
// doesn't exist), so null everywhere lets it reach its 200 without side effects.
const mock = vi.hoisted(() => {
  function makeChain(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: () => chain,
      single: async () => ({ data: null, error: null }),
      then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
    }
    return chain
  }
  const supabaseAdmin = {
    from: () => makeChain(),
    rpc: async () => ({ data: null, error: null }),
  }
  return { supabaseAdmin }
})

// Isolate the signature gate: mock every route dependency EXCEPT the real
// verifyTelnyx (imported transitively by ./route from @/lib/webhook-verify).
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({})) }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({})) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn(() => false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn(async () => null) }))

import { POST } from './route'

// Configured signer.
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const RAW_PUB = spki.subarray(spki.length - 32).toString('base64')

// A DIFFERENT, legitimate Ed25519 keypair — a "foreign" signer whose public key
// is NOT what the route is configured to trust.
const foreign = generateKeyPairSync('ed25519')

function makeRequest(body: string, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: new Headers(headers),
    body,
  })
}

function signWith(body: string, key: KeyObject, tsSeconds: number): Record<string, string> {
  const ts = String(tsSeconds)
  const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), key).toString('base64')
  return { 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig }
}

// A delivery-status event: the cleanest post-verification path to a 200, so the
// control isolates the signature gate rather than any downstream branch.
function statusEvent(): string {
  return JSON.stringify({ data: { event_type: 'message.sent', payload: { id: 'telnyx-msg-1' } } })
}

const freshTs = (): number => Math.floor(Date.now() / 1000)

beforeEach(() => {
  process.env.TELNYX_PUBLIC_KEY = RAW_PUB
  delete process.env.TELNYX_WEBHOOK_VERIFY // ensure the gate is ON (not 'off')
})

describe('telnyx inbound-SMS webhook — signature verify fails closed (401)', () => {
  it('rejects a request with NO signature headers (401)', async () => {
    const res = await POST(makeRequest(statusEvent(), {}) as never)
    expect(res.status).toBe(401)
  })

  it('rejects a GARBAGE signature over a valid timestamp (401)', async () => {
    const headers = {
      'telnyx-timestamp': String(freshTs()),
      'telnyx-signature-ed25519': Buffer.from('not-a-real-signature').toString('base64'),
    }
    const res = await POST(makeRequest(statusEvent(), headers) as never)
    expect(res.status).toBe(401)
  })

  it('rejects a valid signature over a DIFFERENT body (tampered payload) (401)', async () => {
    const ts = freshTs()
    const signedForOther = signWith('{"data":{"event_type":"other"}}', privateKey, ts)
    // Attacker swaps the body but keeps the signature minted for another payload.
    const res = await POST(makeRequest(statusEvent(), signedForOther) as never)
    expect(res.status).toBe(401)
  })

  it('rejects a genuinely valid Ed25519 signature from a FOREIGN keypair (401)', async () => {
    const body = statusEvent()
    const headers = signWith(body, foreign.privateKey, freshTs()) // signed, but wrong key
    const res = await POST(makeRequest(body, headers) as never)
    expect(res.status).toBe(401)
  })
})

describe('telnyx inbound-SMS webhook — valid signature is accepted (non-vacuous control)', () => {
  it('accepts the SAME payload when correctly signed by the configured key (200)', async () => {
    const body = statusEvent()
    const headers = signWith(body, privateKey, freshTs())
    const res = await POST(makeRequest(body, headers) as never)
    expect(res.status).toBe(200)
  })
})
