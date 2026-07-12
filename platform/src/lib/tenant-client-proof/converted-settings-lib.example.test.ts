import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the getSettings DRY probe — the KEEP-SCOPE SPLIT. Mocks BOTH clients and
 * proves the split holds:
 *   - `service_types` (tenant-scoped) is read through tenantClient(tenantId), scoped by tenant_id.
 *   - `tenants` (registry, keyed by id) STAYS on supabaseAdmin and is NEVER read via tenantClient.
 * This is the DRY boundary: the highest-fanout helper is a mixed-source read, not a one-line swap.
 */

type QueryRecord = {
  client: 'admin' | 'scoped'
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  orders: Array<[string, unknown]>
  single: boolean
}

const calls: QueryRecord[] = []

/** Recording builder tagged with which client issued it. Resolves the given result. */
function recordingClient(tag: 'admin' | 'scoped', resultsByTable: Record<string, unknown>) {
  return {
    from(table: string) {
      const rec: QueryRecord = { client: tag, table, selects: [], eqs: [], orders: [], single: false }
      calls.push(rec)
      const result = resultsByTable[table] ?? { data: null, error: null }
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => { rec.selects.push(cols); return builder }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.order = (col: string, opts?: unknown) => { rec.orders.push([col, opts]); return builder }
      builder.single = () => { rec.single = true; return builder }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
}

const adminResults: Record<string, unknown> = {}
const scopedResults: Record<string, unknown> = {}

vi.mock('../supabase', () => ({
  supabaseAdmin: { from: (t: string) => recordingClient('admin', adminResults).from(t) },
}))

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { fetchSettingsSourcesConverted } from './converted-settings-lib.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

beforeEach(() => {
  calls.length = 0
  tenantClientMock.mockReset()
  for (const k of Object.keys(adminResults)) delete adminResults[k]
  for (const k of Object.keys(scopedResults)) delete scopedResults[k]
})

describe('fetchSettingsSourcesConverted (getSettings DRY keep-scope split)', () => {
  it('routes service_types through tenantClient; keeps tenants on supabaseAdmin', async () => {
    adminResults.tenants = { data: { id: TENANT, business_name: 'Acme' }, error: null }
    scopedResults.service_types = { data: [{ name: 'Deep Clean' }], error: null }
    tenantClientMock.mockReturnValue(recordingClient('scoped', scopedResults))

    const res = await fetchSettingsSourcesConverted(TENANT)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)

    const svc = calls.find((c) => c.table === 'service_types')!
    expect(svc.client).toBe('scoped') // CONVERTED read
    expect(svc.eqs).toContainEqual(['tenant_id', TENANT])
    expect(svc.orders).toEqual([['sort_order', { ascending: true }]])

    const ten = calls.find((c) => c.table === 'tenants')!
    expect(ten.client).toBe('admin') // registry read STAYS on admin
    expect(ten.eqs).toContainEqual(['id', TENANT]) // keyed by id, not tenant_id
    expect(ten.single).toBe(true)

    expect(res).toEqual({ tenant: { id: TENANT, business_name: 'Acme' }, services: [{ name: 'Deep Clean' }] })
  })

  it('NEVER reads the tenants registry through the scoped client', async () => {
    adminResults.tenants = { data: { id: TENANT }, error: null }
    scopedResults.service_types = { data: [], error: null }
    tenantClientMock.mockReturnValue(recordingClient('scoped', scopedResults))

    await fetchSettingsSourcesConverted(TENANT)

    const tenantsViaScoped = calls.filter((c) => c.table === 'tenants' && c.client === 'scoped')
    expect(tenantsViaScoped).toHaveLength(0)
  })

  it('the scoped read scopes to the caller tenant, never a second tenant', async () => {
    adminResults.tenants = { data: { id: OTHER }, error: null }
    scopedResults.service_types = { data: [], error: null }
    tenantClientMock.mockReturnValue(recordingClient('scoped', scopedResults))

    await fetchSettingsSourcesConverted(OTHER)

    expect(tenantClientMock).toHaveBeenCalledWith(OTHER)
    const svc = calls.find((c) => c.table === 'service_types')!
    expect(svc.eqs).toContainEqual(['tenant_id', OTHER])
    expect(svc.eqs).not.toContainEqual(['tenant_id', TENANT])
  })

  it('tolerates a null tenant + empty services (faithful: no throw from the fetch)', async () => {
    adminResults.tenants = { data: null, error: null }
    scopedResults.service_types = { data: null, error: null }
    tenantClientMock.mockReturnValue(recordingClient('scoped', scopedResults))

    expect(await fetchSettingsSourcesConverted(TENANT)).toEqual({ tenant: null, services: [] })
  })
})
