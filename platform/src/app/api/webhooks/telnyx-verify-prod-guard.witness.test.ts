/**
 * WITNESS/REGRESSION test for deploy-prep/webhook-hardening-plan.md §4
 * (audit finding #4, P3): "guard the `off` switch so it can't silently
 * disable verification in prod."
 *
 * Before this fix, `TELNYX_WEBHOOK_VERIFY=off` skipped signature
 * verification unconditionally — including in a prod deploy, if that env
 * var were ever set there (leaked from a local `.env`, copy-pasted between
 * environments, etc.). This proves the route now ignores `off` whenever
 * `NODE_ENV === 'production'`, so a forged/unsigned request is rejected
 * regardless of the escape-hatch env var, and confirms the hatch still
 * works normally outside production (no regression for local dev/CI).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn() }))
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn() }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: vi.fn() }))
vi.mock('@/lib/webhook-dedupe', () => ({ claimWebhookEvent: vi.fn().mockResolvedValue(true) }))

import { POST } from './telnyx/route'

function unsignedRequest(): Request {
  return new Request('http://localhost/api/webhooks/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      data: { id: 'evt_1', event_type: 'message.received', payload: { id: 'msg_1' } },
    }),
  })
}

describe('telnyx webhook: TELNYX_WEBHOOK_VERIFY=off prod guard', () => {
  beforeEach(() => {
    vi.stubEnv('TELNYX_WEBHOOK_VERIFY', 'off')
    vi.stubEnv('TELNYX_PUBLIC_KEY', 'unit-test-key-not-a-real-telnyx-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('FIXED: in production, off is ignored — an unsigned request still 401s', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const res = await POST(unsignedRequest())

    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Invalid signature' })
  })

  it('unchanged: outside production, off still skips verification (local dev unaffected)', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    const res = await POST(unsignedRequest())

    // Signature check is skipped entirely — request proceeds past the 401 gate.
    expect(res.status).not.toBe(401)
  })
})
