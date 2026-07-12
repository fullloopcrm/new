/**
 * WITNESS TEST — documents CURRENT (buggy) behavior, not desired behavior.
 *
 * Proves audit finding #1: `telnyx-voice/route.ts` does NOT cryptographically
 * verify the Telnyx signature. It only:
 *   - runs a presence+freshness check, and ONLY when TELNYX_PUBLIC_KEY is set;
 *   - so with the key UNSET it fails OPEN (zero verification);
 *   - and even with the key set, a FORGED signature + fresh timestamp passes,
 *     because the Ed25519 signature is never checked against the key.
 *
 * These assertions describe today's behavior. They should start FAILING once
 * the route switches to `verifyTelnyx(...)` (fail-closed crypto verify). That
 * flip is the signal the fix landed.
 *
 * No route edits. Drives the real POST handler with a benign, unhandled event
 * type so it no-ops (returns 200) without touching any external service.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}), rpc: () => ({}) } }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn() }))

import { POST } from './telnyx-voice/route'

// An event type no branch handles → the handler falls through to its final
// `return NextResponse.json({ ok: true })` with zero side effects. Reaching
// that 200 means the request was ACCEPTED past the (weak) signature gate.
function benignEvent(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ data: { event_type: 'call.other', payload: {} } }),
  })
}

const savedKey = process.env.TELNYX_PUBLIC_KEY

describe('telnyx-voice signature gate (WITNESS: fail-open, no crypto verify)', () => {
  beforeEach(() => {
    delete process.env.TELNYX_PUBLIC_KEY
  })
  afterEach(() => {
    if (savedKey === undefined) delete process.env.TELNYX_PUBLIC_KEY
    else process.env.TELNYX_PUBLIC_KEY = savedKey
  })

  it('FAIL-OPEN: with TELNYX_PUBLIC_KEY unset, an UNSIGNED request is accepted', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    const res = await POST(benignEvent()) // no signature headers at all
    // Not 401 → the request sailed past verification. This is the bug.
    expect(res.status).not.toBe(401)
    expect(res.status).toBe(200)
  })

  it('with the key SET, an unsigned request IS rejected (presence gate active)', async () => {
    process.env.TELNYX_PUBLIC_KEY = 'dummy-key'
    const res = await POST(benignEvent()) // missing both signature headers
    expect(res.status).toBe(401)
  })

  it('NO CRYPTO VERIFY: with the key SET, a FORGED signature + fresh timestamp is accepted', async () => {
    process.env.TELNYX_PUBLIC_KEY = 'dummy-key'
    const res = await POST(
      benignEvent({
        'telnyx-signature-ed25519': 'totally-forged-signature-value',
        'telnyx-timestamp': Math.floor(Date.now() / 1000).toString(),
      }),
    )
    // The forged signature is never checked against the key → 200, not 401.
    expect(res.status).toBe(200)
  })
})
