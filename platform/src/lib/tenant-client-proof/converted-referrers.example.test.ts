import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the referrer-lookup conversion: a PUBLIC, domain-scoped lookup flows
 * through one tenantClient(tenantId) and keeps the tenant scope on BOTH divergent branches —
 * the `code` branch (.eq('referral_code')) and the `email` branch (.ilike('email'), a
 * case-insensitive operator, first in the proof set). Both terminate in .single() (one object
 * or null). The route's swallow-to-null error handling is reproduced verbatim and pinned.
 * No cross-table dep (single table `referrers`, tier #52, floor RLS case, safe cutover).
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { lookupReferrerConverted } from './converted-referrers.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

type QueryRecord = {
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  ilikes: Array<[string, unknown]>
  singled: boolean
}

/** Result may be an Error (rejection) or a { data, error } envelope (Supabase resolves). */
function makeRecordingDb(resultsByTable: Record<string, unknown>) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [], ilikes: [], singled: false }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: null, error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.ilike = (col: string, val: unknown) => { rec.ilikes.push([col, val]); return builder }
      builder.single = () => { rec.singled = true; return builder }
      builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
        if (result instanceof Error) return reject(result)
        return resolve(result)
      }
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('lookupReferrerConverted', () => {
  it('code branch: routes through one tenantClient(tenantId); keeps tenant + referral_code eq; .single()', async () => {
    const row = { id: 'r1', referral_code: 'ABCD123', email: 'A@x.com' }
    const { db, calls } = makeRecordingDb({ referrers: { data: row, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await lookupReferrerConverted(TENANT, { code: 'ABCD123' })

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    const c = calls.find((x) => x.table === 'referrers')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    expect(c.eqs).toContainEqual(['referral_code', 'ABCD123'])
    expect(c.ilikes).toHaveLength(0) // code branch must NOT touch the email operator
    expect(c.singled).toBe(true)
    expect(res).toEqual(row)
  })

  it('email branch: keeps tenant scope + case-insensitive .ilike(email); .single()', async () => {
    const row = { id: 'r2', email: 'boss@x.com' }
    const { db, calls } = makeRecordingDb({ referrers: { data: row, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await lookupReferrerConverted(TENANT, { email: 'BOSS@x.com' })

    const c = calls.find((x) => x.table === 'referrers')!
    expect(c.eqs).toContainEqual(['tenant_id', TENANT])
    // The swap must preserve the case-insensitive operator, not downgrade it to .eq.
    expect(c.ilikes).toContainEqual(['email', 'BOSS@x.com'])
    expect(c.eqs).not.toContainEqual(['referral_code', 'BOSS@x.com'])
    expect(c.singled).toBe(true)
    expect(res).toEqual(row)
  })

  it('scopes to the caller tenant, never a second tenant', async () => {
    const { db, calls } = makeRecordingDb({ referrers: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    await lookupReferrerConverted(OTHER, { code: 'ZZZ999' })

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const c = calls.find((x) => x.table === 'referrers')!
    expect(c.eqs).toContainEqual(['tenant_id', OTHER])
    expect(c.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('reproduces the route swallow-to-null: RLS denial / no-row both return null, NOT a throw', async () => {
    // The live route destructures only `data` and ignores `error`, so a .single() miss AND an
    // RLS default-deny both render as null → 404. Faithful reproduction (contrast the
    // client-contacts proof which throws to surface the denial).
    const { db } = makeRecordingDb({
      referrers: { data: null, error: { message: 'permission denied for table referrers' } },
    })
    tenantClientMock.mockReturnValue(db)

    const res = await lookupReferrerConverted(TENANT, { code: 'ABCD123' })
    expect(res).toBeNull()
  })

  it('neither code nor email: returns null with no DB read (route would 400)', async () => {
    const { db, calls } = makeRecordingDb({ referrers: { data: null, error: null } })
    tenantClientMock.mockReturnValue(db)

    const res = await lookupReferrerConverted(TENANT, {})

    expect(res).toBeNull()
    expect(calls).toHaveLength(0) // no client query issued
  })
})
