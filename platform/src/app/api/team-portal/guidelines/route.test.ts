import { describe, it, expect, beforeEach, vi } from 'vitest'

/** Zero prior coverage: auth gate + the tenant settings.team_guidelines parse
 * (string-JSON vs object) and its fall-through-to-null on malformed data. */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001'

let tenantResult: unknown = { settings: null }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: tenantResult, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('../auth/token', () => ({
  verifyToken: (token: string) => (token === 'valid-token' ? { id: 'm1', tid: TENANT, role: 'worker' } : null),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

beforeEach(() => {
  tenantResult = { settings: null }
})

function authedReq(token?: string) {
  return new NextRequest('https://x/api/team-portal/guidelines', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

describe('team-portal/guidelines', () => {
  it('REJECTS (401) with no bearer token', async () => {
    const res = await GET(authedReq())
    expect(res.status).toBe(401)
  })

  it('REJECTS (401) with an invalid token', async () => {
    const res = await GET(authedReq('garbage'))
    expect(res.status).toBe(401)
  })

  it('returns sections:null when the tenant has no settings row', async () => {
    tenantResult = null
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.sections).toBeNull()
  })

  it('returns sections:null when settings has no team_guidelines key', async () => {
    tenantResult = { settings: { other_key: true } }
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.sections).toBeNull()
  })

  it('parses settings.team_guidelines from an OBJECT-shaped settings column', async () => {
    tenantResult = { settings: { team_guidelines: [{ title: 'Safety', body: 'Wear gloves' }] } }
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.sections).toEqual([{ title: 'Safety', body: 'Wear gloves' }])
  })

  it('parses settings.team_guidelines from a STRING-shaped (JSON) settings column', async () => {
    tenantResult = { settings: JSON.stringify({ team_guidelines: [{ title: 'Safety', body: 'Wear gloves' }] }) }
    const res = await GET(authedReq('valid-token'))
    const body = await res.json()
    expect(body.sections).toEqual([{ title: 'Safety', body: 'Wear gloves' }])
  })

  it('falls back to sections:null (not a 500) on malformed JSON settings', async () => {
    tenantResult = { settings: '{not valid json' }
    const res = await GET(authedReq('valid-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sections).toBeNull()
  })
})
