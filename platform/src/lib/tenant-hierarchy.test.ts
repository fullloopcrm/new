import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-hierarchy.ts is the one place that reads tenants.parent_tenant_id —
 * cycle prevention (create-sub-tenant.ts) and descendant-access checks
 * (tenant.ts, tenant-query.ts) both go through it. Mocking strategy mirrors
 * tenant.test.ts / tenant-query.test.ts: a tiny query-builder double for
 * supabaseAdmin keyed by (table, eq-filters).
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolve(table, eqs),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const mockCookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined) }),
}))

const verifyImpersonationCookie = vi.fn<(raw: string | undefined) => string | null>()
vi.mock('./impersonation', () => ({
  IMPERSONATE_COOKIE: 'fl_impersonate',
  verifyImpersonationCookie: (raw: string | undefined) => verifyImpersonationCookie(raw),
}))

import { getAncestorChain, isDescendantOfTenant, wouldCreateCycle, resolveDescendantImpersonation } from './tenant-hierarchy'

// tenant graph used throughout: root -> mid -> leaf (leaf's grandparent is root)
const PARENTS: Record<string, string | null> = {
  root: null,
  mid: 'root',
  leaf: 'mid',
  // an unrelated standalone tenant, for negative cases
  other: null,
}

beforeEach(() => {
  verifyImpersonationCookie.mockReset().mockReturnValue(null)
  mockCookieStore.clear()
  resolve = (table, eqs) => {
    if (table === 'tenants') {
      const id = eqs.id as string
      if (id in PARENTS) return { data: { parent_tenant_id: PARENTS[id] }, error: null }
    }
    return { data: null, error: null }
  }
})

describe('getAncestorChain', () => {
  it('returns an empty chain for a standalone tenant', async () => {
    expect(await getAncestorChain('root')).toEqual([])
  })

  it('walks multiple levels up in order', async () => {
    expect(await getAncestorChain('leaf')).toEqual(['mid', 'root'])
  })

  it('stops at MAX_CHAIN_DEPTH instead of looping forever on a corrupt cycle', async () => {
    // root2 -> root2 (a self-loop that slipped past the DB CHECK, e.g. via
    // direct SQL). getAncestorChain must not hang.
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.id === 'root2') return { data: { parent_tenant_id: 'root2' }, error: null }
      return { data: null, error: null }
    }
    const chain = await getAncestorChain('root2')
    expect(chain.length).toBeLessThanOrEqual(1) // seen-set catches it on the first repeat
  })
})

describe('isDescendantOfTenant', () => {
  it('true when the candidate is a direct parent', async () => {
    expect(await isDescendantOfTenant('mid', 'root')).toBe(true)
  })

  it('true when the candidate is a grandparent (multi-level)', async () => {
    expect(await isDescendantOfTenant('leaf', 'root')).toBe(true)
  })

  it('false for a sibling relationship, not just unrelated tenants', async () => {
    // 'mid' and a hypothetical sibling both under 'root' — mid is NOT a
    // descendant of a sibling, only of 'root' itself.
    expect(await isDescendantOfTenant('mid', 'other')).toBe(false)
  })

  it('false when checked against itself', async () => {
    expect(await isDescendantOfTenant('root', 'root')).toBe(false)
  })
})

describe('wouldCreateCycle', () => {
  it('true when a tenant is proposed as its own parent', async () => {
    expect(await wouldCreateCycle('root', 'root')).toBe(true)
  })

  it('true when the proposed parent is actually a descendant of the child', async () => {
    // re-parenting 'root' under 'leaf' would create root -> leaf -> mid -> root
    expect(await wouldCreateCycle('root', 'leaf')).toBe(true)
  })

  it('false for a legitimate, non-cyclic re-parent', async () => {
    expect(await wouldCreateCycle('other', 'root')).toBe(false)
  })
})

describe('resolveDescendantImpersonation', () => {
  it('returns the target tenant when it is a verified descendant', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    verifyImpersonationCookie.mockReturnValue('leaf')
    resolve = (table, eqs) => {
      const id = eqs.id as string
      if (table === 'tenants' && id === 'leaf') {
        // First call (chain walk) wants parent_tenant_id; final call wants the
        // full row — a superset object satisfies both.
        return { data: { id: 'leaf', slug: 'leaf', name: 'Leaf', status: 'active', parent_tenant_id: 'mid' }, error: null }
      }
      if (table === 'tenants' && id in PARENTS) return { data: { parent_tenant_id: PARENTS[id] }, error: null }
      return { data: null, error: null }
    }

    const result = await resolveDescendantImpersonation('root')
    expect(result?.id).toBe('leaf')
  })

  it('returns null when the cookie targets a tenant that is NOT a descendant — no sideways/unrelated access', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    verifyImpersonationCookie.mockReturnValue('other')

    const result = await resolveDescendantImpersonation('root')
    expect(result).toBeNull()
  })

  it('returns null when no impersonation cookie is present', async () => {
    const result = await resolveDescendantImpersonation('root')
    expect(result).toBeNull()
  })

  it('returns null when the cookie targets the head tenant itself', async () => {
    mockCookieStore.set('fl_impersonate', 'signed-cookie')
    verifyImpersonationCookie.mockReturnValue('root')

    const result = await resolveDescendantImpersonation('root')
    expect(result).toBeNull()
  })
})
