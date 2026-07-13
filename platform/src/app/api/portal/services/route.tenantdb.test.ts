import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/portal/services.
 * The service_types listing used to carry a manual .eq('tenant_id', auth.tid).
 * Proves a client only ever sees their own tenant's active services, never a
 * foreign tenant's, even when both tenants define services with identical ids.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'shared-client-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => Promise.resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { GET } from './route'

beforeEach(() => {
  DB.service_types = [
    { id: 'shared-service-id', tenant_id: TENANT_A, name: 'A Standard Clean', active: true, sort_order: 1 },
    { id: 'shared-service-id', tenant_id: TENANT_B, name: 'B Standard Clean', active: true, sort_order: 1 },
  ]
})

describe('GET /api/portal/services — tenantDb scoping', () => {
  it('returns only the caller tenant\'s active services, never a foreign tenant row sharing the service id', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/services', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.services).toHaveLength(1)
    expect(body.services[0].name).toBe('A Standard Clean')
  })
})
