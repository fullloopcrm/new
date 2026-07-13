import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'

/**
 * Zero prior coverage. This route's entire access control is a self-rolled
 * HMAC token (<team_member_id>.<expiry_ms>.<sig>) — no session, no bearer
 * auth, just signature verification. That makes tamper-resistance the whole
 * security model; the "bad signature" and "expired" cases are mutation-
 * verified below (breaking the signature check flips them RED).
 */

const SECRET = 'unit-test-admin-password'
const MEMBER = '11111111-0000-0000-0000-000000000001'

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

function validToken(memberId = MEMBER, expiryMs = Date.now() + 60_000): string {
  const payload = `${memberId}.${expiryMs}`
  return `${payload}.${sign(payload)}`
}

const updates: Array<{ table: string; payload: Record<string, unknown>; idEq?: string; emailEq?: string }> = []
let memberLookupResult: unknown = { id: MEMBER, name: 'Jane Doe', email: 'jane@example.com', phone: '5551234567' }
let updateError: unknown = null

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let entry: { table: string; payload: Record<string, unknown>; idEq?: string; emailEq?: string } | undefined
    const c: Record<string, unknown> = {
      select: () => c,
      update: (payload: Record<string, unknown>) => {
        entry = { table, payload }
        updates.push(entry)
        return c
      },
      eq: (col: string, val: string) => {
        if (entry) {
          if (col === 'id') entry.idEq = val
          if (col === 'email') entry.emailEq = val
        }
        return c
      },
      single: async () => {
        if (table === 'team_members') return { data: memberLookupResult, error: updateError }
        return { data: null, error: null }
      },
      then: (res: (v: { error: unknown }) => unknown) => res({ error: updateError }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { GET, POST } from './route'

beforeEach(() => {
  process.env.ADMIN_PASSWORD = SECRET
  updates.length = 0
  memberLookupResult = { id: MEMBER, name: 'Jane Doe', email: 'jane@example.com', phone: '5551234567' }
  updateError = null
})

describe('team-portal/update-phone GET', () => {
  it('REJECTS an empty token', async () => {
    const res = await GET(new Request('https://x/api/team-portal/update-phone?token='))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('malformed')
  })

  it('REJECTS a malformed token (wrong segment count)', async () => {
    const res = await GET(new Request('https://x/api/team-portal/update-phone?token=onlyonepart'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('malformed')
  })

  it('REJECTS a tampered signature — mutation-verified', async () => {
    const token = validToken()
    const [id, exp, sig] = token.split('.')
    const flippedSig = (sig[0] === '0' ? '1' : '0') + sig.slice(1)
    const tampered = `${id}.${exp}.${flippedSig}`
    const res = await GET(new Request(`https://x/api/team-portal/update-phone?token=${tampered}`))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('bad_signature')
  })

  it('REJECTS an expired token even with a valid signature', async () => {
    const token = validToken(MEMBER, Date.now() - 1000)
    const res = await GET(new Request(`https://x/api/team-portal/update-phone?token=${token}`))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('expired')
  })

  it('REJECTS when the member no longer exists', async () => {
    memberLookupResult = null
    const res = await GET(new Request(`https://x/api/team-portal/update-phone?token=${validToken()}`))
    expect(res.status).toBe(404)
  })

  it('ALLOWS a valid, unexpired token and returns the current phone', async () => {
    const res = await GET(new Request(`https://x/api/team-portal/update-phone?token=${validToken()}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.current_phone).toBe('5551234567')
  })
})

describe('team-portal/update-phone POST', () => {
  function postReq(body: Record<string, unknown>) {
    return new Request('https://x/api/team-portal/update-phone', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  it('REJECTS a tampered token and writes nothing — mutation-verified', async () => {
    const token = validToken()
    const [id, exp, sig] = token.split('.')
    const flippedSig = (sig[0] === '0' ? '1' : '0') + sig.slice(1)
    const tampered = `${id}.${exp}.${flippedSig}`
    const res = await POST(postReq({ token: tampered, phone: '5559876543' }))
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('REJECTS an invalid phone number and writes nothing', async () => {
    const res = await POST(postReq({ token: validToken(), phone: '123' }))
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('normalizes and saves a valid phone, scoped to the token member id', async () => {
    const res = await POST(postReq({ token: validToken(), phone: '(555) 987-6543' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phone).toBe('5559876543')
    const memberUpdate = updates.find((u) => u.table === 'team_members')
    expect(memberUpdate?.idEq).toBe(MEMBER)
    expect(memberUpdate?.payload.phone).toBe('5559876543')
  })

  it('cascades the phone sync to cleaner_applications by the member email', async () => {
    const res = await POST(postReq({ token: validToken(), phone: '5559876543' }))
    expect(res.status).toBe(200)
    const cascade = updates.find((u) => u.table === 'cleaner_applications')
    expect(cascade?.emailEq).toBe('jane@example.com')
    expect(cascade?.payload.phone).toBe('5559876543')
  })

  it('does NOT cascade when the member has no email on file', async () => {
    memberLookupResult = { id: MEMBER, email: null }
    const res = await POST(postReq({ token: validToken(), phone: '5559876543' }))
    expect(res.status).toBe(200)
    expect(updates.find((u) => u.table === 'cleaner_applications')).toBeUndefined()
  })
})
