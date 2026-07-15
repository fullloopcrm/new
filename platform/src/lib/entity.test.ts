import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * isEntityOwnedByTenant guards every finance write that accepts a caller-
 * supplied entity_id (periods, cpa-tokens, expenses, bank-accounts). Several
 * of those routes join entities(name) on GET, so a foreign entity_id that
 * slips through an insert/update leaks another tenant's business entity name.
 */

const TENANT = 'tenant-a'
const OTHER_TENANT = 'tenant-b'
const OWN_ENTITY = 'entity-own-1'
const FOREIGN_ENTITY = 'entity-foreign-1'

type Row = Record<string, any>
const entities: Row[] = [
  { id: OWN_ENTITY, tenant_id: TENANT },
  { id: FOREIGN_ENTITY, tenant_id: OTHER_TENANT },
]

vi.mock('@/lib/supabase', () => {
  function chain() {
    const eqs: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        const found = entities.find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v))
        return { data: found ?? null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: () => chain() } }
})

import { isEntityOwnedByTenant } from '@/lib/entity'

describe('isEntityOwnedByTenant', () => {
  beforeEach(() => {})

  it('returns true for an entity owned by the tenant', async () => {
    expect(await isEntityOwnedByTenant(TENANT, OWN_ENTITY)).toBe(true)
  })

  it('returns false for an entity owned by another tenant', async () => {
    expect(await isEntityOwnedByTenant(TENANT, FOREIGN_ENTITY)).toBe(false)
  })

  it('returns false for a nonexistent entity id', async () => {
    expect(await isEntityOwnedByTenant(TENANT, 'no-such-entity')).toBe(false)
  })
})
