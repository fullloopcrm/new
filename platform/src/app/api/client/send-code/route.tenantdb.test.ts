import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/client/send-code.
 * tenantDb().upsert() always stamps tenant_id from the caller's tenant context
 * (overriding anything the handler passes), so a route that silently reverted
 * to unscoped supabaseAdmin.upsert() with a caller-controlled tenant_id would
 * risk writing — or conflict-matching onto — a different tenant's row.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  let upsertRow: Row | null = null
  const c: Record<string, unknown> = {
    upsert: (row: Row, _opts?: unknown) => { upsertRow = row; return c },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      if (upsertRow) {
        const rows = DB[table] || (DB[table] = [])
        const existing = rows.find((r) => r.tenant_id === upsertRow!.tenant_id && r.identifier === upsertRow!.identifier)
        if (existing) Object.assign(existing, upsertRow)
        else rows.push({ ...upsertRow })
      }
      return resolve({ data: null, error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: { value: Row } = { value: { id: TENANT_A, name: 'Tenant A' } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { POST } from './route'

beforeEach(() => {
  DB.verification_codes = []
  tenantCtx.value = { id: TENANT_A, name: 'Tenant A' }
})

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/client/send-code — tenantDb scoping', () => {
  it('stamps the caller tenant onto the verification_codes row', async () => {
    const res = await POST(req({ email: 'a@x.com' }))
    expect(res.status).toBe(200)
    expect(DB.verification_codes).toHaveLength(1)
    expect(DB.verification_codes[0]).toMatchObject({ tenant_id: TENANT_A, identifier: 'a@x.com' })
  })

  it('does not overwrite a same-identifier code that belongs to a different tenant', async () => {
    DB.verification_codes.push({ tenant_id: TENANT_B, identifier: 'shared@x.com', code: '999999', used: false })
    const res = await POST(req({ email: 'shared@x.com' }))
    expect(res.status).toBe(200)
    expect(DB.verification_codes).toHaveLength(2)
    const foreign = DB.verification_codes.find((r) => r.tenant_id === TENANT_B)
    expect(foreign?.code).toBe('999999')
    const mine = DB.verification_codes.find((r) => r.tenant_id === TENANT_A)
    expect(mine).toBeDefined()
  })
})
