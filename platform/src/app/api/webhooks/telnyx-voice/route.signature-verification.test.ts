import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

/**
 * /api/webhooks/telnyx-voice previously only checked that the
 * telnyx-signature-ed25519 / telnyx-timestamp headers were *present* and the
 * timestamp wasn't stale — it never cryptographically verified the signature
 * against the body, so any request with fabricated headers sailed through
 * and could drive outbound calls/SMS via the call-control lifecycle below.
 * This locks in the same fail-closed-when-configured contract as the telnyx
 * SMS webhook's verifyTelnyx usage (src/app/api/webhooks/telnyx/route.ts):
 *   - TELNYX_PUBLIC_KEY set + forged/missing signature => 401, never reaches
 *     the call-control handling logic
 *   - TELNYX_PUBLIC_KEY set + valid signature => passes verification
 *   - TELNYX_PUBLIC_KEY unset => unchanged (no verification) — pre-existing
 *     behavior, not addressed here
 */

const supabaseFrom = vi.fn((..._args: unknown[]) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
  insert: () => Promise.resolve({ data: null, error: null }),
  update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => supabaseFrom(...args),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}))

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))

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

describe('telnyx-voice webhook — signature verification', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const spkiBuf = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
  const rawPub = spkiBuf.subarray(spkiBuf.length - 32).toString('base64')

  function sign(ts: string, body: string): string {
    return cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
  }

  const unmatchedEventBody = JSON.stringify({ data: { event_type: 'call.machine.detection.ended', payload: {} } })

  beforeEach(() => {
    vi.resetModules()
    supabaseFrom.mockClear()
    sendSMS.mockClear()
    process.env.TELNYX_PUBLIC_KEY = rawPub
  })

  it('rejects a forged signature (wrong keypair) — fails closed, never processes the event', async () => {
    const { POST } = await import('./route')
    const ts = Math.floor(Date.now() / 1000).toString()
    const { privateKey: attackerKey } = generateKeyPairSync('ed25519')
    const forgedSig = cryptoSign(null, Buffer.from(`${ts}|${unmatchedEventBody}`, 'utf8'), attackerKey).toString('base64')

    const res = await POST(req({ rawBody: unmatchedEventBody, signature: forgedSig, timestamp: ts }) as never)

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a tampered body under a signature signed for a different body', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const originalBody = JSON.stringify({ data: { event_type: 'call.initiated', payload: { call_control_id: 'cc1', from: '+15550001111', direction: 'incoming' } } })
    const sig = sign(ts, originalBody)
    const tamperedBody = JSON.stringify({ data: { event_type: 'call.initiated', payload: { call_control_id: 'cc1', from: '+15559998888', direction: 'incoming' } } })

    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: tamperedBody, signature: sig, timestamp: ts }) as never)

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('rejects a missing signature header when a key is configured (fail-closed)', async () => {
    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: unmatchedEventBody, timestamp: Math.floor(Date.now() / 1000).toString() }) as never)

    expect(res.status).toBe(401)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })

  it('accepts a valid signature and proceeds to process the event', async () => {
    const ts = Math.floor(Date.now() / 1000).toString()
    const sig = sign(ts, unmatchedEventBody)

    const { POST } = await import('./route')
    const res = await POST(req({ rawBody: unmatchedEventBody, signature: sig, timestamp: ts }) as never)

    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('unset TELNYX_PUBLIC_KEY => unchanged behavior, no signature required', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    const { POST } = await import('./route')

    const res = await POST(req({ rawBody: unmatchedEventBody }) as never)

    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})
