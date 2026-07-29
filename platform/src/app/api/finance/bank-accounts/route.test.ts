/**
 * Characterization tests for finance/bank-accounts GET + validation/defaults
 * on POST — the gaps left by route.witness.test.ts, which only covers the
 * cross-tenant entity_id/coa_id injection witness. GET (list, active filter,
 * entity filter, embeds) and POST's name-required validation + column
 * defaults were entirely untested.
 *
 * Pins:
 *   - GET is tenant-scoped, only active=true accounts, embeds
 *     chart_of_accounts()/entities(), and entity_id query param narrows it
 *   - POST 400s when name is missing
 *   - POST defaults: type='checking', currency='USD', mask/institution/coa_id
 *     null when omitted; entity_id falls back to getDefaultEntityId when
 *     omitted (mocked here — its own logic isn't this route's job to prove)
 *   - both short-circuit on an auth failure
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const DEFAULT_ENTITY = 'ent-default'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<
      | { tenant: { userId: string; tenantId: string; tenant: { id: string }; role: string }; error: null }
      | { tenant: null; error: Response }
    > => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null }),
  ),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

vi.mock('@/lib/entity', async () => {
  const actual = await vi.importActual<typeof import('@/lib/entity')>('@/lib/entity')
  return { ...actual, getDefaultEntityId: vi.fn(async () => DEFAULT_ENTITY) }
})

import { GET, POST } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({ bank_accounts: [], entities: [{ id: DEFAULT_ENTITY, tenant_id: CTX_TENANT }] })
  holder.from = h.from
})

function getReq(qs = ''): Request {
  return new Request(`http://t/api/finance/bank-accounts${qs}`)
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/finance/bank-accounts', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('lists only active accounts for the caller tenant, with embeds', async () => {
    h.seed.bank_accounts.push(
      { id: 'acc-active', tenant_id: CTX_TENANT, active: true, chart_of_accounts: { code: '1010', name: 'Checking', type: 'asset' }, entities: { id: DEFAULT_ENTITY, name: 'Main' } },
      { id: 'acc-inactive', tenant_id: CTX_TENANT, active: false },
      { id: 'acc-foreign', tenant_id: OTHER_TENANT, active: true },
    )
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.bank_accounts.map((a: { id: string }) => a.id)).toEqual(['acc-active'])
    expect(body.bank_accounts[0].chart_of_accounts).toEqual({ code: '1010', name: 'Checking', type: 'asset' })
  })

  it('an entity_id query param narrows the list to that entity', async () => {
    h.seed.bank_accounts.push(
      { id: 'acc-a', tenant_id: CTX_TENANT, active: true, entity_id: 'ent-a' },
      { id: 'acc-b', tenant_id: CTX_TENANT, active: true, entity_id: 'ent-b' },
    )
    const res = await GET(getReq('?entity_id=ent-a'))
    const body = await res.json()
    expect(body.bank_accounts.map((a: { id: string }) => a.id)).toEqual(['acc-a'])
  })
})

describe('POST /api/finance/bank-accounts', () => {
  it('400s when name is missing', async () => {
    const res = await POST(postReq({}))
    expect(res.status).toBe(400)
  })

  it('creates an account defaulting type=checking, currency=USD, and falls back to the default entity', async () => {
    const res = await POST(postReq({ name: 'Main Checking' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.bank_account).toMatchObject({
      tenant_id: CTX_TENANT, name: 'Main Checking', type: 'checking', currency: 'USD',
      mask: null, institution: null, coa_id: null, entity_id: DEFAULT_ENTITY,
    })
  })

  it('honors an explicit type, currency, mask, and institution', async () => {
    const res = await POST(postReq({ name: 'Savings', type: 'savings', currency: 'CAD', mask: '4321', institution: 'Chase' }))
    const body = await res.json()
    expect(body.bank_account).toMatchObject({ type: 'savings', currency: 'CAD', mask: '4321', institution: 'Chase' })
  })

  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await POST(postReq({ name: 'X' }))
    expect(res.status).toBe(403)
  })
})
