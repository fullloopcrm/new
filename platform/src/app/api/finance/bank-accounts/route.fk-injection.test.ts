/**
 * POST /api/finance/bank-accounts — cross-tenant FK injection on entity_id +
 * coa_id. GET on this same route embeds entities(id, name) and
 * chart_of_accounts(code, name, type) on every bank account row, so an
 * unverified entity_id/coa_id on create would let a caller point a new bank
 * account at another tenant's entity/CoA row and exfiltrate its name/code
 * through their own GET /api/finance/bank-accounts. PATCH on the [id] sibling
 * already verifies coa_id (P10 register) — this create path was the missed
 * sibling for both FKs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    bank_accounts: [],
    entities: [
      { id: 'ent-A1', tenant_id: TENANT_A, name: 'Acme A', is_default: true },
      { id: 'ent-B1', tenant_id: TENANT_B, name: 'Acme B (secret)', is_default: true },
    ],
    chart_of_accounts: [
      { id: 'coa-A1', tenant_id: TENANT_A, code: '1000', name: 'Cash' },
      { id: 'coa-B1', tenant_id: TENANT_B, code: '9999', name: 'Other tenant secret account' },
    ],
  }
})

describe('POST /api/finance/bank-accounts — cross-tenant FK injection', () => {
  it('rejects an entity_id belonging to another tenant and does not create the bank account', async () => {
    const res = await POST(postReq({ name: 'Checking', entity_id: 'ent-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.bank_accounts.length).toBe(0)
  })

  it('rejects a coa_id belonging to another tenant and does not create the bank account', async () => {
    const res = await POST(postReq({ name: 'Checking', coa_id: 'coa-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.bank_accounts.length).toBe(0)
  })

  it('creates the bank account when entity_id + coa_id genuinely belong to the caller tenant', async () => {
    const res = await POST(postReq({ name: 'Checking', entity_id: 'ent-A1', coa_id: 'coa-A1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bank_account.entity_id).toBe('ent-A1')
    expect(json.bank_account.coa_id).toBe('coa-A1')
  })

  it('falls back to the tenant default entity when entity_id is omitted', async () => {
    const res = await POST(postReq({ name: 'Checking' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.bank_account.entity_id).toBe('ent-A1')
    expect(json.bank_account.coa_id).toBe(null)
  })
})
