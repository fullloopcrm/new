import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT
 * /api/team-portal/preferences. The team_members notes read/write used to
 * carry a manual .eq('tenant_id', auth.tid). Proves a member reading/writing
 * their own notification preferences never touches a foreign tenant's
 * team_members row sharing the same member id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, PUT } from './route'

beforeEach(() => {
  DB.team_members = [
    { id: MEMBER_ID, tenant_id: TENANT_A, notes: JSON.stringify({ sms_consent: true }) },
    { id: MEMBER_ID, tenant_id: TENANT_B, notes: JSON.stringify({ sms_consent: true }) },
  ]
})

describe('GET /api/team-portal/preferences — tenantDb scoping', () => {
  it('reads only the caller tenant\'s own preferences, not a foreign tenant row sharing the member id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/preferences', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sms_consent).toBe(true)
  })
})

describe('PUT /api/team-portal/preferences — tenantDb scoping', () => {
  it('updates only the caller tenant\'s row, never the foreign tenant\'s row sharing the member id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/preferences', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sms_consent: false }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const memberA = DB.team_members.find((r) => r.tenant_id === TENANT_A)!
    const memberB = DB.team_members.find((r) => r.tenant_id === TENANT_B)!
    expect(JSON.parse(memberA.notes as string).sms_consent).toBe(false)
    expect(JSON.parse(memberB.notes as string).sms_consent).toBe(true)
  })
})
