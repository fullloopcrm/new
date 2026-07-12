import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import crypto from 'crypto'

/**
 * team-portal-auth.ts gates every field-staff (/team) portal route.
 * `requirePortalPermission` is the shared middleware that (1) verifies the
 * bearer token, (2) re-checks the member is still active on EVERY call (instant
 * revocation — a suspended/removed member is locked out immediately, not at
 * token expiry), and (3) checks the member's role against the tenant's effective
 * portal permission set. It is the only thing between a field worker's phone and
 * cross-member / cross-tenant data, so it must fail CLOSED:
 *
 *   - no / malformed / foreign-signed / expired token   -> 401
 *   - member suspended or removed                        -> 401 (instant revoke)
 *   - token's tenant ≠ the member's tenant               -> 401 (tenant isolation)
 *   - role lacks the permission                          -> 403
 *   - a tenant's permission override never leaks to another tenant
 *
 * This module was previously uncovered (no test imported it). The token verifier
 * (real HMAC via TEAM_PORTAL_SECRET) and portal-rbac (real permission resolver)
 * are the genuine system under test; only supabaseAdmin is replaced — with a
 * FAITHFUL in-memory table that honors BOTH `.eq('id')` and `.eq('tenant_id')`,
 * so a dropped tenant filter in the code would let the cross-tenant token pass
 * and fail this suite. Every rejection is paired with a positive control that
 * authorizes, so no assertion passes vacuously.
 */

// ---- Faithful in-memory supabase double (hoisted above the vi.mock) ----
type Row = Record<string, unknown>
const db = vi.hoisted(() => {
  const tables: Record<string, Row[]> = { team_members: [], tenants: [], crew_members: [] }
  return { tables }
})

vi.mock('@/lib/supabase', () => {
  function makeBuilder(table: string) {
    const eqs: [string, unknown][] = []
    const ins: [string, unknown[]][] = []
    const run = (): Row[] =>
      (db.tables[table] || []).filter(
        (r) =>
          eqs.every(([c, v]) => r[c] === v) &&
          ins.every(([c, vs]) => vs.includes(r[c] as never)),
      )
    const builder = {
      select: () => builder,
      eq: (c: string, v: unknown) => {
        eqs.push([c, v])
        return builder
      },
      in: (c: string, vs: unknown[]) => {
        ins.push([c, vs])
        return builder
      },
      single: async () => {
        const rows = run()
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: 'no rows' } }
      },
      // Awaited without .single() (e.g. scopedMemberIds) → resolve to { data: rows }.
      then: (
        resolve: (v: { data: Row[]; error: null }) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve({ data: run(), error: null }).then(resolve, reject),
    }
    return builder
  }
  return { supabaseAdmin: { from: (t: string) => makeBuilder(t) } }
})

import { requirePortalPermission, scopedMemberIds, type PortalAuth } from './team-portal-auth'

const SECRET = 'team-portal-secret-under-test'
const FOREIGN_SECRET = 'a-totally-different-team-secret'
const ORIG_SECRET = process.env.TEAM_PORTAL_SECRET

/** Mint a `payload.hmac` team-portal token signed with `secret`. */
function mintToken(
  payload: { id: string; tid: string; r?: string; exp?: number },
  secret: string,
): string {
  const raw = JSON.stringify({
    id: payload.id,
    tid: payload.tid,
    pr: 0,
    r: payload.r ?? 'worker',
    exp: payload.exp ?? Date.now() + 24 * 3600 * 1000,
  })
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return Buffer.from(raw).toString('base64') + '.' + hmac
}

const reqWith = (token?: string) =>
  new Request('https://x.test/api/team-portal/whatever', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
  db.tables.team_members = [
    { id: 'm-active', tenant_id: 'tenant-A', status: 'active' },
    { id: 'm-suspended', tenant_id: 'tenant-A', status: 'suspended' },
    { id: 'm-active-B', tenant_id: 'tenant-B', status: 'active' },
    { id: 'm-mgr', tenant_id: 'tenant-A', status: 'active' },
    { id: 'm-mgr2', tenant_id: 'tenant-A', status: 'active' },
  ]
  db.tables.tenants = [
    // tenant-A grants workers the roster permission via override; tenant-C does not.
    {
      id: 'tenant-A',
      selena_config: { portal_role_permissions: { worker: { 'team.view_roster': true } } },
    },
    { id: 'tenant-C', selena_config: {} },
  ]
  db.tables.crew_members = []
})

afterAll(() => {
  if (ORIG_SECRET === undefined) delete process.env.TEAM_PORTAL_SECRET
  else process.env.TEAM_PORTAL_SECRET = ORIG_SECRET
})

describe('requirePortalPermission — positive control (gate opens)', () => {
  it('authorizes an active member whose role holds the permission', async () => {
    const token = mintToken({ id: 'm-active', tid: 'tenant-A', r: 'worker' }, SECRET)
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.error).toBeNull()
    expect(res.auth).toEqual({ id: 'm-active', tid: 'tenant-A', role: 'worker' })
  })
})

describe('requirePortalPermission — fail closed on missing / bad token', () => {
  it('401 when no Authorization header is present', async () => {
    const res = await requirePortalPermission(reqWith(undefined), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })

  it('401 for a token with a tampered signature', async () => {
    const token = mintToken({ id: 'm-active', tid: 'tenant-A' }, SECRET)
    const [payloadB64, sig] = token.split('.')
    const flipped = sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a')
    const res = await requirePortalPermission(reqWith(`${payloadB64}.${flipped}`), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })

  it('401 for a token signed with a foreign secret', async () => {
    const token = mintToken({ id: 'm-active', tid: 'tenant-A' }, FOREIGN_SECRET)
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })

  it('401 for a validly-signed but EXPIRED token', async () => {
    const token = mintToken({ id: 'm-active', tid: 'tenant-A', exp: Date.now() - 60_000 }, SECRET)
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })
})

describe('requirePortalPermission — instant revocation', () => {
  it('401 for a SUSPENDED member even with a perfectly valid token (revoke beats token expiry)', async () => {
    const token = mintToken({ id: 'm-suspended', tid: 'tenant-A', r: 'worker' }, SECRET)
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })
})

describe('requirePortalPermission — tenant isolation', () => {
  it('401 when the token tenant does not match the member row tenant (cross-tenant token)', async () => {
    // m-active really lives in tenant-A; a token claiming tenant-B must not match.
    const token = mintToken({ id: 'm-active', tid: 'tenant-B', r: 'worker' }, SECRET)
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)

    // Positive control: the same member with the CORRECT tenant passes, proving
    // the 401 above is the tenant filter, not a blanket block.
    const good = mintToken({ id: 'm-active', tid: 'tenant-A', r: 'worker' }, SECRET)
    const ok = await requirePortalPermission(reqWith(good), 'messages.use')
    expect(ok.error).toBeNull()
  })
})

describe('requirePortalPermission — permission enforcement', () => {
  it('403 when the role lacks the permission (worker has no team.view_roster) — paired with a manager that passes', async () => {
    const worker = mintToken({ id: 'm-active', tid: 'tenant-C', r: 'worker' }, SECRET)
    db.tables.team_members.push({ id: 'm-active', tenant_id: 'tenant-C', status: 'active' })
    const denied = await requirePortalPermission(reqWith(worker), 'team.view_roster')
    expect(denied.auth).toBeNull()
    expect(denied.error!.status).toBe(403)

    const mgr = mintToken({ id: 'm-mgr', tid: 'tenant-C', r: 'manager' }, SECRET)
    db.tables.team_members.push({ id: 'm-mgr', tenant_id: 'tenant-C', status: 'active' })
    const allowed = await requirePortalPermission(reqWith(mgr), 'team.view_roster')
    expect(allowed.error).toBeNull()
  })

  it("a tenant's override grants a permission the default denies — and does NOT leak to a tenant without the override", async () => {
    // tenant-A override grants worker → team.view_roster. tenant-C has no override.
    const aWorker = mintToken({ id: 'm-active', tid: 'tenant-A', r: 'worker' }, SECRET)
    const aRes = await requirePortalPermission(reqWith(aWorker), 'team.view_roster')
    expect(aRes.error).toBeNull() // override applied for tenant-A

    db.tables.team_members.push({ id: 'm-active', tenant_id: 'tenant-C', status: 'active' })
    const cWorker = mintToken({ id: 'm-active', tid: 'tenant-C', r: 'worker' }, SECRET)
    const cRes = await requirePortalPermission(reqWith(cWorker), 'team.view_roster')
    expect(cRes.auth).toBeNull() // no leak: tenant-C worker still denied
    expect(cRes.error!.status).toBe(403)
  })
})

describe('requirePortalPermission — misconfiguration', () => {
  it('401 when TEAM_PORTAL_SECRET is unset (verifyToken throws → treated as unauthorized)', async () => {
    const token = mintToken({ id: 'm-active', tid: 'tenant-A' }, SECRET)
    delete process.env.TEAM_PORTAL_SECRET
    const res = await requirePortalPermission(reqWith(token), 'messages.use')
    expect(res.auth).toBeNull()
    expect(res.error!.status).toBe(401)
  })
})

describe('scopedMemberIds — visibility isolation', () => {
  it('a worker sees ONLY themselves', async () => {
    const auth: PortalAuth = { id: 'm-active', tid: 'tenant-A', role: 'worker' }
    expect(await scopedMemberIds(auth)).toEqual(['m-active'])
  })

  it('a manager sees all ACTIVE members of their OWN tenant and none from another tenant', async () => {
    const auth: PortalAuth = { id: 'm-mgr', tid: 'tenant-A', role: 'manager' }
    const ids = await scopedMemberIds(auth)
    // tenant-A active members only; the suspended one and tenant-B's member excluded.
    expect(ids.sort()).toEqual(['m-active', 'm-mgr', 'm-mgr2'])
    expect(ids).not.toContain('m-active-B') // cross-tenant member never visible
    expect(ids).not.toContain('m-suspended') // inactive excluded
  })

  it('a lead with no crews degrades to just themselves (no accidental fan-out)', async () => {
    const auth: PortalAuth = { id: 'm-active', tid: 'tenant-A', role: 'lead' }
    expect(await scopedMemberIds(auth)).toEqual(['m-active'])
  })
})
