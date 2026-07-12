import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * tenant-db.ts (`tenantDb(tenantId)`) is the app-layer cross-tenant isolation
 * guard. Every query runs through the service_role key, which BYPASSES RLS, so
 * isolation depends on a `.eq('tenant_id', …)` filter on reads and a stamped
 * tenant_id on writes. This wrapper makes the safe path the default. It is a
 * primary data-leak guard, so its contract must hold with NO exceptions:
 *
 *   - select / update / delete are ALWAYS filtered to the caller's tenant
 *   - insert / upsert ALWAYS stamp tenant_id, and OVERRIDE any caller-supplied
 *     tenant_id (a caller cannot smuggle a row into another tenant)
 *   - every row of a bulk insert/upsert is stamped (none escapes scoping)
 *   - an empty tenantId is rejected (fail closed, never an unscoped query)
 *   - the caller's input object is not mutated
 *
 * This module was previously uncovered. supabaseAdmin is replaced with a call
 * RECORDER (not a canned result), so the assertions verify the wrapper actually
 * emits the tenant_id filter/stamp — a wrapper that dropped the `.eq` or the
 * stamp would fail here rather than pass vacuously.
 */

type Call = { method: string; args: unknown[] }
const rec = vi.hoisted(() => ({ calls: [] as { method: string; args: unknown[] }[] }))

vi.mock('@/lib/supabase', () => {
  const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq'] as const
  function builder() {
    const b: Record<string, (...a: unknown[]) => unknown> = {}
    for (const m of chainMethods) {
      b[m] = (...args: unknown[]) => {
        rec.calls.push({ method: m, args })
        return b
      }
    }
    return b
  }
  return {
    supabaseAdmin: {
      from: (table: string) => {
        rec.calls.push({ method: 'from', args: [table] })
        return builder()
      },
    },
  }
})

import { tenantDb } from './tenant-db'

const TENANT = 'tenant-A'
const FOREIGN = 'tenant-EVIL'

const eqCalls = (): Call[] => rec.calls.filter((c) => c.method === 'eq')
const callOf = (method: string): Call | undefined => rec.calls.find((c) => c.method === method)
const hasTenantEq = (t: string) => eqCalls().some((c) => c.args[0] === 'tenant_id' && c.args[1] === t)

beforeEach(() => {
  rec.calls = []
})

describe('tenantDb — fail closed on missing tenant', () => {
  it('throws when tenantId is empty (never builds an unscoped query)', () => {
    expect(() => tenantDb('')).toThrow('requires a tenantId')
  })
})

describe('tenantDb — reads are auto-scoped', () => {
  it('select applies .eq(tenant_id, <caller tenant>)', () => {
    tenantDb(TENANT).from('bookings').select('*')
    expect(hasTenantEq(TENANT)).toBe(true)
  })

  it('update applies .eq(tenant_id, <caller tenant>)', () => {
    tenantDb(TENANT).from('bookings').update({ status: 'done' })
    expect(hasTenantEq(TENANT)).toBe(true)
  })

  it('delete applies .eq(tenant_id, <caller tenant>)', () => {
    tenantDb(TENANT).from('bookings').delete()
    expect(hasTenantEq(TENANT)).toBe(true)
  })

  it('scopes to the SPECIFIC caller tenant — a different tenant id is not what gets filtered', () => {
    tenantDb(TENANT).from('bookings').select('*')
    expect(hasTenantEq(TENANT)).toBe(true)
    expect(hasTenantEq(FOREIGN)).toBe(false)
  })
})

describe('tenantDb — writes stamp tenant_id and override caller values', () => {
  it('insert stamps tenant_id on a single row', () => {
    tenantDb(TENANT).from('bookings').insert({ name: 'x' })
    const c = callOf('insert')!
    expect(c.args[0]).toEqual({ name: 'x', tenant_id: TENANT })
  })

  it('insert OVERRIDES a caller-supplied foreign tenant_id (no cross-tenant smuggling)', () => {
    tenantDb(TENANT).from('bookings').insert({ name: 'x', tenant_id: FOREIGN })
    const c = callOf('insert')!
    expect((c.args[0] as Record<string, unknown>).tenant_id).toBe(TENANT)
  })

  it('insert stamps EVERY row of a bulk insert (none escapes scoping)', () => {
    tenantDb(TENANT)
      .from('bookings')
      .insert([{ name: 'a' }, { name: 'b', tenant_id: FOREIGN }])
    const rows = callOf('insert')!.args[0] as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.tenant_id === TENANT)).toBe(true)
  })

  it('upsert stamps tenant_id and overrides a caller-supplied foreign value', () => {
    tenantDb(TENANT)
      .from('settings')
      .upsert({ key: 'k', tenant_id: FOREIGN }, { onConflict: 'tenant_id,key' })
    const c = callOf('upsert')!
    expect((c.args[0] as Record<string, unknown>).tenant_id).toBe(TENANT)
    // onConflict target is forwarded unchanged.
    expect(c.args[1]).toEqual({ onConflict: 'tenant_id,key' })
  })
})

describe('tenantDb — immutability', () => {
  it('does not mutate the caller input row', () => {
    const input: Record<string, unknown> = { name: 'x' }
    tenantDb(TENANT).from('bookings').insert(input)
    expect(input.tenant_id).toBeUndefined() // original untouched
  })
})
