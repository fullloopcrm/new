import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the helper. The query builder resolves to
// whatever `nextResult` holds when `.in()` is awaited.
let nextResult: { data: { id: string }[] | null } = { data: [] }
const inMock = vi.fn().mockImplementation(() => Promise.resolve(nextResult))
const eqMock = vi.fn().mockReturnValue({ in: inMock })
const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
const fromMock = vi.fn().mockReturnValue({ select: selectMock })

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => fromMock(...args) },
}))

import { findForeignRef, stripImmutable } from './verify-tenant-refs'

describe('findForeignRef', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nextResult = { data: [] }
  })

  it('returns null when no ids are provided', async () => {
    const r = await findForeignRef('t1', [{ table: 'clients', ids: [null, undefined, ''] }])
    expect(r).toBeNull()
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('returns null when every id belongs to the tenant', async () => {
    nextResult = { data: [{ id: 'c1' }, { id: 'c2' }] }
    const r = await findForeignRef('t1', [{ table: 'clients', ids: ['c1', 'c2'] }])
    expect(r).toBeNull()
    expect(fromMock).toHaveBeenCalledWith('clients')
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 't1')
  })

  it('flags the first id not found within the tenant', async () => {
    nextResult = { data: [{ id: 'c1' }] } // c2 missing → foreign
    const r = await findForeignRef('t1', [{ table: 'clients', ids: ['c1', 'c2'] }])
    expect(r).toEqual({ table: 'clients', id: 'c2' })
  })

  it('treats a null query result as all-foreign', async () => {
    nextResult = { data: null }
    const r = await findForeignRef('t1', [{ table: 'team_members', ids: ['m1'] }])
    expect(r).toEqual({ table: 'team_members', id: 'm1' })
  })
})

describe('stripImmutable', () => {
  it('drops tenant_id, id, and created_at', () => {
    const out = stripImmutable({
      tenant_id: 'victim', id: 'x', created_at: 'now', status: 'active', notes: 'ok',
    })
    expect(out).toEqual({ status: 'active', notes: 'ok' })
  })

  it('returns {} for non-object input', () => {
    expect(stripImmutable(null as unknown as Record<string, unknown>)).toEqual({})
  })

  it('does not mutate the input', () => {
    const input = { tenant_id: 't', keep: 1 }
    stripImmutable(input)
    expect(input).toEqual({ tenant_id: 't', keep: 1 })
  })
})
