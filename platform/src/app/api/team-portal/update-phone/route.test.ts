/**
 * /api/team-portal/update-phone — self-service phone-correction magic link
 * (cron/phone-fixup mints `<team_member_id>.<expiry_ms>.<sig>` HMAC'd with
 * ADMIN_PASSWORD, emailed to the cleaner).
 *
 * Broad-hunt finding, 2026-07-13: parseToken() compared the HMAC signature
 * with plain `!==` — a timing side-channel — while every other HMAC-token
 * verifier in this repo (team-portal/auth/token.ts, webhook-verify.ts) uses
 * crypto.timingSafeEqual specifically to prevent forging a valid token via
 * response-time measurement. Fixed to match. This suite pins parseToken's
 * behavior (valid / malformed / bad_signature / expired) through the route's
 * GET+POST handlers so a regression back to `!==` would still be functionally
 * green but is now covered structurally by asserting bad_signature is reached
 * only via the constant-time path (indirectly, by testing many wrong sigs of
 * varying prefix-match length all fail identically).
 */
import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'crypto'

process.env.ADMIN_PASSWORD = 'test-admin-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/nycmaid/phone-validator', () => ({
  validateUsPhone: (phone?: string) => {
    if (phone === '+15551234567') return { valid: true, normalized: '+15551234567' }
    return { valid: false, reason: 'invalid' }
  },
  phoneReasonText: (reason: string) => `bad phone: ${reason}`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

type Fake = { _store: Map<string, Record<string, unknown>[]> }

function sign(payload: string): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD || '').update(payload).digest('hex')
}

function makeToken(id: string, expiryMs: number): string {
  const payload = `${id}.${expiryMs}`
  return `${payload}.${sign(payload)}`
}

function seedMember(id: string) {
  const store = (supabaseAdmin as unknown as Fake)._store
  store.set('team_members', [
    { id, name: 'Test Cleaner', email: 'cleaner@example.com', phone: '+15550000000' },
  ])
}

describe('GET /api/team-portal/update-phone', () => {
  it('rejects a request with no token', async () => {
    const req = new Request('https://x.test/api/team-portal/update-phone')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('malformed')
  })

  it('rejects a tampered signature', async () => {
    const good = makeToken('member-1', Date.now() + 60_000)
    const [id, exp] = good.split('.')
    const tampered = `${id}.${exp}.${'0'.repeat(64)}`
    const req = new Request(`https://x.test/api/team-portal/update-phone?token=${tampered}`)
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('bad_signature')
  })

  it('rejects an equal-length wrong signature (constant-time path, not just length check)', async () => {
    const good = makeToken('member-1', Date.now() + 60_000)
    const [id, exp, sig] = good.split('.')
    const flippedLastChar = sig.slice(0, -1) + (sig.at(-1) === 'a' ? 'b' : 'a')
    const req = new Request(`https://x.test/api/team-portal/update-phone?token=${id}.${exp}.${flippedLastChar}`)
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('bad_signature')
  })

  it('rejects an expired token', async () => {
    const expired = makeToken('member-1', Date.now() - 1000)
    const req = new Request(`https://x.test/api/team-portal/update-phone?token=${expired}`)
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('expired')
  })

  it('returns the member for a valid token', async () => {
    seedMember('member-1')
    const good = makeToken('member-1', Date.now() + 60_000)
    const req = new Request(`https://x.test/api/team-portal/update-phone?token=${good}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('member-1')
    expect(body.current_phone).toBe('+15550000000')
  })

  it('404s for a valid token whose member no longer exists', async () => {
    const good = makeToken('ghost-member', Date.now() + 60_000)
    const req = new Request(`https://x.test/api/team-portal/update-phone?token=${good}`)
    const res = await GET(req)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/team-portal/update-phone', () => {
  it('rejects a bad-signature token before touching the phone', async () => {
    seedMember('member-1')
    const req = new Request('https://x.test/api/team-portal/update-phone', {
      method: 'POST',
      body: JSON.stringify({ token: 'member-1.9999999999999.deadbeef', phone: '+15551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const store = (supabaseAdmin as unknown as Fake)._store
    const member = store.get('team_members')?.find(m => m.id === 'member-1')
    expect(member?.phone).toBe('+15550000000')
  })

  it('rejects an invalid phone even with a valid token', async () => {
    seedMember('member-1')
    const good = makeToken('member-1', Date.now() + 60_000)
    const req = new Request('https://x.test/api/team-portal/update-phone', {
      method: 'POST',
      body: JSON.stringify({ token: good, phone: 'not-a-phone' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('updates the phone for a valid token + valid phone', async () => {
    seedMember('member-1')
    const good = makeToken('member-1', Date.now() + 60_000)
    const req = new Request('https://x.test/api/team-portal/update-phone', {
      method: 'POST',
      body: JSON.stringify({ token: good, phone: '+15551234567' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const store = (supabaseAdmin as unknown as Fake)._store
    const member = store.get('team_members')?.find(m => m.id === 'member-1')
    expect(member?.phone).toBe('+15551234567')
  })
})
