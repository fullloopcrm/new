import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

/**
 * Telnyx voice webhook — PostgREST .or() injection regression [queue b follow-up].
 *
 * call_control_id comes straight from the inbound webhook JSON body. It used
 * to be interpolated raw into `.or(customer_call_id.eq.X,admin_call_id.eq.X)`,
 * letting a crafted id break out of the intended filter (e.g. inject extra
 * OR conditions via `,`). Assert the value reaching `.or()` is sanitized.
 *
 * The route's signature check now cryptographically verifies the Ed25519
 * signature (previously it only checked a header was present) and fails
 * closed without a configured key, so this test signs its request for real
 * instead of relying on the old skip-when-unconfigured gap.
 */

const h = vi.hoisted(() => ({ capturedOr: '' as string }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        or: (filter: string) => {
          h.capturedOr = filter
          return chain
        },
        eq: () => chain,
        update: () => chain,
        insert: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn() }))

import { POST } from './route'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const RAW_PUB = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

beforeEach(() => {
  h.capturedOr = ''
  process.env.TELNYX_PUBLIC_KEY = RAW_PUB
})

describe('POST /api/webhooks/telnyx-voice — call_control_id .or() injection guard', () => {
  it('sanitizes a call_control_id crafted to break out of the .or() filter', async () => {
    const maliciousId = 'x,status.eq.bridged,or(id.eq.1)"'
    const body = JSON.stringify({
      data: {
        event_type: 'call.recording.saved',
        payload: {
          call_control_id: maliciousId,
          recording_urls: { mp3: 'https://example.com/rec.mp3' },
        },
      },
    })
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
    const req = new Request('http://x/api/webhooks/telnyx-voice', {
      method: 'POST',
      headers: { 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig },
      body,
    })

    await POST(req as unknown as Parameters<typeof POST>[0])

    // The captured filter must not contain the raw structural characters
    // from the malicious id — they'd let the attacker inject extra
    // conditions or break out of the customer_call_id/admin_call_id scope.
    // The only commas allowed are the two the route itself inserts to
    // separate customer_call_id.eq.X from admin_call_id.eq.X.
    expect(h.capturedOr).not.toContain(',status.eq.bridged')
    expect(h.capturedOr).not.toMatch(/[()"]/)
    expect(h.capturedOr.split(',')).toHaveLength(2)
    expect(h.capturedOr).toBe(
      'customer_call_id.eq.x status.eq.bridged or id.eq.1,admin_call_id.eq.x status.eq.bridged or id.eq.1'
    )
  })
})
