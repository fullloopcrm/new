import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Telnyx voice webhook — PostgREST .or() injection regression [queue b follow-up].
 *
 * call_control_id comes straight from the inbound webhook JSON body. This
 * route's signature check (TELNYX_PUBLIC_KEY) only verifies a header is
 * present and fresh — it does not cryptographically verify the ed25519
 * signature — so call_control_id is effectively attacker-influenced input,
 * same threat model as the search-box/category fields fixed in fef4642.
 * It used to be interpolated raw into `.or(customer_call_id.eq.X,admin_call_id.eq.X)`,
 * letting a crafted id break out of the intended filter (e.g. inject extra
 * OR conditions via `,`). Assert the value reaching `.or()` is sanitized.
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

beforeEach(() => {
  h.capturedOr = ''
  delete process.env.TELNYX_PUBLIC_KEY
})

describe('POST /api/webhooks/telnyx-voice — call_control_id .or() injection guard', () => {
  it('sanitizes a call_control_id crafted to break out of the .or() filter', async () => {
    const maliciousId = 'x,status.eq.bridged,or(id.eq.1)"'
    const req = new Request('http://x/api/webhooks/telnyx-voice', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          event_type: 'call.recording.saved',
          payload: {
            call_control_id: maliciousId,
            recording_urls: { mp3: 'https://example.com/rec.mp3' },
          },
        },
      }),
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
