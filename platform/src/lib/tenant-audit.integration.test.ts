import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * audit-context.test.ts and supabase.test.ts each verify one half of P9's
 * write-auditing mechanism in isolation (context propagation; the write
 * interceptor), mocking the other half away. This test wires the REAL
 * tenant-query.ts + audit-context.ts + supabase.ts together — only actual
 * I/O boundaries (next/headers, admin-auth verifiers, fetch) are mocked — to
 * prove a route handler's ordinary `await getTenantForRequest()` followed by
 * a `supabaseAdmin` write actually produces a tenant_audit_log row, end to
 * end, the way it will in a real route.
 */

type Eqs = Record<string, unknown>
let dbResolver: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let cookieMap: Record<string, string>
let headerMap: Record<string, string>
let ownerUserId: string | null

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (cookieMap[n] !== undefined ? { value: cookieMap[n] } : undefined),
  }),
  headers: async () => ({ get: (n: string) => headerMap[n] ?? null }),
}))
vi.mock('@/lib/owner-session', () => ({ getOwnerUserId: async () => ownerUserId }))
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: () => false,
  verifyTenantAdminToken: () => null,
}))
vi.mock('./impersonation', () => ({ IMPERSONATE_COOKIE: 'fl_impersonate', verifyImpersonationCookie: () => null }))
vi.mock('./tenant-header-sig', () => ({ verifyTenantHeaderSig: () => false }))

function jsonResponse(status: number, body: unknown): Response {
  const text = body === undefined ? '' : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status < 300 ? 'OK' : 'Error',
    headers: { get: () => null },
    text: async () => text,
  } as unknown as Response
}

type FetchCall = { table: string; method: string; body: unknown }
let calls: FetchCall[]

beforeEach(() => {
  cookieMap = {}
  headerMap = { 'x-invoke-path': '/api/clients', 'x-invoke-method': 'POST' }
  ownerUserId = null
  dbResolver = () => ({ data: null, error: null })
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method: string; body?: string }) => {
      const table = String(url).split('/rest/v1/')[1]?.split('?')[0] ?? ''
      const body = init.body ? JSON.parse(init.body) : undefined
      calls.push({ table, method: init.method, body })
      if (table === 'tenant_audit_log' || table === 'impersonation_events') return jsonResponse(201, [{ id: 'log-1' }])
      if (init.method === 'POST' && table === 'clients') return jsonResponse(201, [{ id: 'client-99' }])
      // GET reads used by getTenantForRequest's tenant/membership lookups —
      // route through dbResolver so tests can control what's "in the DB".
      // .single() expects a bare object body, not an array.
      return jsonResponse(200, dbResolver(table, {}).data)
    }),
  )
})

describe('P9 end-to-end: getTenantForRequest() actor reaches a later supabaseAdmin write', () => {
  it('attributes a write made after getTenantForRequest() to the resolved Clerk member', async () => {
    ownerUserId = 'clerk-user-1'
    dbResolver = (table) => {
      if (table === 'tenant_members') return { data: { tenant_id: 't-1', role: 'staff' }, error: null }
      if (table === 'tenants') return { data: { id: 't-1', name: 'Tenant 1', slug: 't-1', status: 'active' }, error: null }
      return { data: null, error: null }
    }

    const { getTenantForRequest } = await import('./tenant-query')
    const { supabaseAdmin } = await import('./supabase')

    const ctx = await getTenantForRequest()
    expect(ctx.tenantId).toBe('t-1')

    await supabaseAdmin.from('clients').insert({ name: 'Jane' }).select()

    const auditCall = calls.find((c) => c.table === 'tenant_audit_log')
    expect(auditCall).toBeTruthy()
    expect(auditCall!.body).toMatchObject({
      actor_kind: 'clerk_user',
      actor_id: 'clerk-user-1',
      actor_role: 'staff',
      tenant_id: 't-1',
      table_name: 'clients',
      action: 'insert',
      record_id: 'client-99',
      path: '/api/clients',
      method: 'POST',
    })
  })
})
