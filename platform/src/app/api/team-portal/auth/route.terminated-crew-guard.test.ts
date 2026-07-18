import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/team-portal/auth — terminated-crew guard on PIN login.
 *
 * requirePortalPermission's per-request re-check (team-portal-auth.ts) now
 * blocks a terminated member's EXISTING token, but this route (PIN login,
 * where a fresh token is minted) only ever checked team_members.status --
 * which HR termination never touches (PATCH /api/dashboard/hr/[id] writes
 * hr_status='terminated' to hr_employee_profiles only). Without this check a
 * fired worker could keep logging back in by PIN forever, not just ride out
 * an existing token for its 24h life.
 */

type Eqs = Record<string, unknown>
type Handler = (eqs: Eqs, inVals: unknown[]) => unknown

let handlers: Record<string, Handler> = {}

function builder(table: string) {
  const eqs: Eqs = {}
  let inVals: unknown[] = []
  const resolveRow = () => {
    const handler = handlers[table]
    if (!handler) throw new Error(`no mock handler configured for table "${table}"`)
    return handler(eqs, inVals)
  }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = vals
      inVals = vals
      return chain
    },
    single: async () => ({ data: resolveRow() }),
    maybeSingle: async () => ({ data: resolveRow(), error: null }),
    then: (onFulfilled: (v: { data: unknown }) => unknown) =>
      Promise.resolve({ data: resolveRow() }).then(onFulfilled),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 4 }),
}))

vi.mock('./token', () => ({ createToken: () => 'minted-token' }))

import { POST } from './route'

function req(opts: { pin?: string; tenant_slug?: string }): Request {
  return {
    headers: { get: () => null },
    json: async () => ({ pin: opts.pin, tenant_slug: opts.tenant_slug }),
  } as unknown as Request
}

beforeEach(() => {
  handlers = {
    tenants: () => ({ id: 't-1', name: 'Alpha', phone: null }),
    team_members: () => ({ id: 'm-1', name: 'Larry', preferred_language: null, pay_rate: null, avatar_url: null, role: 'worker' }),
    hr_employee_profiles: () => [],
  }
})

describe('team-portal auth POST — terminated-crew guard on PIN login', () => {
  it('BLOCKED: a terminated member cannot mint a fresh token via PIN, even though team_members.status is still active', async () => {
    handlers.hr_employee_profiles = () => [{ team_member_id: 'm-1' }]

    const res = await POST(req({ pin: '1234', tenant_slug: 'alpha' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid PIN')
  })

  it('CONTROL: an active, non-terminated member still logs in and gets a token', async () => {
    const res = await POST(req({ pin: '1234', tenant_slug: 'alpha' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('minted-token')
  })
})
