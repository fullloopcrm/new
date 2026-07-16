import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/tenants — onboarding "create my business" endpoint.
 *
 * This is the WRITE path behind every resolver-lane read I've hardened
 * elsewhere in this lane (tenant.ts / tenant-lookup.ts / tenant-query.ts):
 * it's the only place a tenant_members row gets inserted for a Clerk user,
 * and its pre-insert duplicate check (`clerk_user_id` already has a
 * membership?) is exactly what keeps `tenant_members.clerk_user_id` a de
 * facto 1:1 mapping — the assumption getTenantForRequest()/getCurrentTenant()
 * now defensively guard against (they throw loud on an ambiguous 2+-tenant
 * membership instead of silently guessing) rather than something this route
 * was actually preventing.
 *
 * BUG (fixed here): both the duplicate-membership check and the slug-
 * uniqueness check used `.single()` with the `error` field discarded (only
 * `data` was destructured). A genuine transient DB failure surfaces
 * identically to "0 rows" once destructured this way — single() can't tell
 * "no existing membership" apart from "the read itself failed" — so on a
 * real DB blip this route used to silently proceed as if the check passed:
 *   - membership check: inserts a SECOND tenant_members row for a user who
 *     may already own a tenant, producing the exact ambiguous-membership
 *     case getTenantForRequest() now has to reject at read time.
 *   - slug check: inserts a tenant whose slug may already be claimed,
 *     racing the resolver's own getTenantBySlug() lookup.
 * Fixed with maybeSingle() + an explicit error check (mirrors the pattern
 * already applied throughout tenant.ts / tenant-lookup.ts / tenant-query.ts).
 */

type Resolution = { data: unknown; error: unknown }
type Call = { table: string; op: 'select' | 'insert'; eqs: Record<string, unknown> }

const calls: Call[] = []
let resolveSelect: (table: string, eqs: Record<string, unknown>) => Resolution
let resolveInsert: (table: string, payload: unknown) => Resolution

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let isInsert = false
  let insertPayload: unknown = null

  const finish = (): Resolution => {
    if (isInsert) {
      calls.push({ table, op: 'insert', eqs })
      return resolveInsert(table, insertPayload)
    }
    calls.push({ table, op: 'select', eqs })
    return resolveSelect(table, eqs)
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    insert: (payload: unknown) => {
      isInsert = true
      insertPayload = payload
      return chain
    },
    single: async () => finish(),
    maybeSingle: async () => finish(),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(finish()).then(onFulfilled, onRejected),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const getOwnerUserId = vi.fn<() => Promise<string | null>>()
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: () => getOwnerUserId() }))

import { POST } from './route'

const USER_ID = 'clerk-user-1'

function post(body: unknown) {
  return POST(new Request('http://t/api/tenants', { method: 'POST', body: JSON.stringify(body) }))
}

// Default: no existing membership, slug available. Individual tests override
// via resolveSelect/resolveInsert for the case under test.
function notFound(): Resolution {
  return { data: null, error: null }
}

beforeEach(() => {
  calls.length = 0
  getOwnerUserId.mockReset()
  getOwnerUserId.mockResolvedValue(USER_ID)
  resolveSelect = () => notFound()
  resolveInsert = (table: string, payload: unknown) => ({
    data: { id: `${table}-new-id`, ...(payload as Record<string, unknown>) },
    error: null,
  })
})

describe('POST /api/tenants — masked-error probes', () => {
  it('MASKED-ERROR PROBE: a genuine DB failure on the duplicate-membership check fails loud (500), not silently treated as "no membership"', async () => {
    resolveSelect = (table) => {
      if (table === 'tenant_members') {
        return { data: null, error: { message: 'read replica unreachable' } }
      }
      return notFound()
    }

    const res = await post({ name: 'Acme Cleaning' })

    expect(res.status).toBe(500)
    // Must not have proceeded to create a tenant off an unverified check.
    expect(calls.some((c) => c.table === 'tenants' && c.op === 'insert')).toBe(false)
    expect(calls.some((c) => c.table === 'tenant_members' && c.op === 'insert')).toBe(false)
  })

  it('a real existing membership still blocks onboarding with 400 (not a false positive from the fix)', async () => {
    resolveSelect = (table) => {
      if (table === 'tenant_members') {
        return { data: { tenant_id: 'existing-tenant-id' }, error: null }
      }
      return notFound()
    }

    const res = await post({ name: 'Acme Cleaning' })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('You already belong to a business')
    expect(calls.some((c) => c.table === 'tenants' && c.op === 'insert')).toBe(false)
  })

  it('MASKED-ERROR PROBE: a genuine DB failure on the slug-uniqueness check fails loud (500), not silently treated as "slug available"', async () => {
    resolveSelect = (table) => {
      if (table === 'tenants') {
        return { data: null, error: { message: 'statement timeout' } }
      }
      return notFound()
    }

    const res = await post({ name: 'Acme Cleaning' })

    expect(res.status).toBe(500)
    expect(calls.some((c) => c.table === 'tenants' && c.op === 'insert')).toBe(false)
  })

  it('a real slug collision still blocks onboarding with 400 (not a false positive from the fix)', async () => {
    resolveSelect = (table) => {
      if (table === 'tenants') {
        return { data: { id: 'existing-tenant-id' }, error: null }
      }
      return notFound()
    }

    const res = await post({ name: 'Acme Cleaning' })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('A business with a similar name already exists')
    expect(calls.some((c) => c.table === 'tenants' && c.op === 'insert')).toBe(false)
  })

  it('WRONG-TENANT / no-op-blocked PROBE: with both checks genuinely clear, onboarding proceeds and inserts exactly one tenant_members row for this Clerk user', async () => {
    const res = await post({ name: 'Acme Cleaning' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.tenant).toBeTruthy()

    const memberInserts = calls.filter((c) => c.table === 'tenant_members' && c.op === 'insert')
    expect(memberInserts).toHaveLength(1)
  })
})
