import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabaseAdmin before importing tenant-db — tests the REAL wrapper
// implementation (not the in-memory test fake used by route isolation tests).
const { eqMock, baseMock, fromMock } = vi.hoisted(() => {
  const eqMock = vi.fn()
  const baseMock = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  }
  const fromMock = vi.fn(() => baseMock)
  return { eqMock, baseMock, fromMock }
})

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

import { tenantDb } from './tenant-db'

describe('tenantDb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqMock.mockReturnValue('eq-result')
    baseMock.select.mockReturnValue({ eq: eqMock })
    baseMock.update.mockReturnValue({ eq: eqMock })
    baseMock.delete.mockReturnValue({ eq: eqMock })
    baseMock.insert.mockReturnValue('insert-result')
    baseMock.upsert.mockReturnValue('upsert-result')
  })

  it('throws if tenantId is empty', () => {
    expect(() => tenantDb('')).toThrow('tenantDb requires a tenantId')
  })

  it('from() delegates to supabaseAdmin.from with the given table name', () => {
    tenantDb('tenant-A').from('bookings')
    expect(fromMock).toHaveBeenCalledWith('bookings')
  })

  it('select() defaults to "*" and always filters by tenant_id', () => {
    const result = tenantDb('tenant-A').from('bookings').select()
    expect(baseMock.select).toHaveBeenCalledWith('*', undefined)
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 'tenant-A')
    expect(result).toBe('eq-result')
  })

  it('select() passes custom columns and opts through to the base builder', () => {
    tenantDb('tenant-A').from('bookings').select('id,status', { count: 'exact' })
    expect(baseMock.select).toHaveBeenCalledWith('id,status', { count: 'exact' })
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 'tenant-A')
  })

  it('insert() stamps tenant_id on a single row', () => {
    tenantDb('tenant-A').from('bookings').insert({ id: 'b1', status: 'new' })
    expect(baseMock.insert).toHaveBeenCalledWith({ id: 'b1', status: 'new', tenant_id: 'tenant-A' })
  })

  it('insert() stamps tenant_id on every row of an array', () => {
    tenantDb('tenant-A').from('bookings').insert([{ id: 'b1' }, { id: 'b2' }])
    expect(baseMock.insert).toHaveBeenCalledWith([
      { id: 'b1', tenant_id: 'tenant-A' },
      { id: 'b2', tenant_id: 'tenant-A' },
    ])
  })

  it('insert() overrides a caller-supplied tenant_id rather than trusting it', () => {
    tenantDb('tenant-A').from('bookings').insert({ id: 'b1', tenant_id: 'attacker-tenant' })
    expect(baseMock.insert).toHaveBeenCalledWith({ id: 'b1', tenant_id: 'tenant-A' })
  })

  it('update() filters by tenant_id after applying the values', () => {
    const result = tenantDb('tenant-A').from('bookings').update({ status: 'done' })
    expect(baseMock.update).toHaveBeenCalledWith({ status: 'done', tenant_id: 'tenant-A' })
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 'tenant-A')
    expect(result).toBe('eq-result')
  })

  it('update() overrides a caller-supplied tenant_id rather than trusting it', () => {
    tenantDb('tenant-A').from('bookings').update({ status: 'done', tenant_id: 'attacker-tenant' })
    expect(baseMock.update).toHaveBeenCalledWith({ status: 'done', tenant_id: 'tenant-A' })
  })

  it('delete() filters by tenant_id', () => {
    const result = tenantDb('tenant-A').from('bookings').delete()
    expect(baseMock.delete).toHaveBeenCalledWith()
    expect(eqMock).toHaveBeenCalledWith('tenant_id', 'tenant-A')
    expect(result).toBe('eq-result')
  })

  it('upsert() stamps tenant_id and forwards onConflict opts', () => {
    tenantDb('tenant-A').from('bookings').upsert({ id: 'b1' }, { onConflict: 'id' })
    expect(baseMock.upsert).toHaveBeenCalledWith({ id: 'b1', tenant_id: 'tenant-A' }, { onConflict: 'id' })
  })

  it('scopes to the tenantId captured at tenantDb() call time, independent of other instances', () => {
    tenantDb('tenant-A').from('bookings').select()
    tenantDb('tenant-B').from('bookings').select()
    expect(eqMock).toHaveBeenNthCalledWith(1, 'tenant_id', 'tenant-A')
    expect(eqMock).toHaveBeenNthCalledWith(2, 'tenant_id', 'tenant-B')
  })
})
