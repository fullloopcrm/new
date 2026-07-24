import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Tenant-isolation probe for GET/POST /api/portal/contacts — proves a portal
 * token only ever sees/creates client_contacts rows under its OWN tenant +
 * client, even when a same-id client_contacts row exists under a different
 * tenant (id collision) or a different client under the same tenant.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const CLIENT_A = 'client-a'
const CLIENT_A2 = 'client-a2' // different client, same tenant as A
const fake = supabaseAdmin as unknown as FakeSupabase

function req(method = 'GET', body?: unknown): Request {
  return new Request('http://x/api/portal/contacts', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_A, tid: TENANT_A }
  fake._seed('client_contacts', [
    { id: 'cc-a', tenant_id: TENANT_A, client_id: CLIENT_A, name: 'Own', is_primary: true, phone_e164: '+15550000001', email: null, receives_sms: true, receives_email: false, created_at: '2026-01-01' },
    // Same client id under a DIFFERENT tenant — must never leak into tenant A's list.
    { id: 'cc-foreign-tenant', tenant_id: TENANT_B, client_id: CLIENT_A, name: 'Foreign tenant', is_primary: true, phone_e164: '+15550000002', email: null, receives_sms: true, receives_email: false, created_at: '2026-01-01' },
    // Different client, SAME tenant — must never leak into client A's own list.
    { id: 'cc-other-client', tenant_id: TENANT_A, client_id: CLIENT_A2, name: 'Other client', is_primary: true, phone_e164: '+15550000003', email: null, receives_sms: true, receives_email: false, created_at: '2026-01-01' },
  ])
})

describe('GET /api/portal/contacts — isolation', () => {
  it('returns only this client’s own contacts, never a foreign-tenant or sibling-client row', async () => {
    const res = await GET(req() as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.contacts as Array<{ id: string }>).map((c) => c.id)
    expect(ids).toEqual(['cc-a'])
  })
})

describe('POST /api/portal/contacts — isolation + unverified-on-create', () => {
  it('stamps the new contact with the AUTHENTICATED tenant/client, never a caller-supplied one', async () => {
    const res = await POST(req('POST', { phone: '5559998888', tenant_id: TENANT_B, client_id: CLIENT_A2 }) as never)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.contact).toBeTruthy()
    const stored = fake._all('client_contacts').find((r) => r.phone_e164 === '+15559998888')
    expect(stored?.tenant_id).toBe(TENANT_A)
    expect(stored?.client_id).toBe(CLIENT_A)
  })

  it('a newly-added contact starts with receives_sms/receives_email forced false, regardless of what the client requests', async () => {
    const res = await POST(req('POST', { phone: '5551234567', email: 'new@example.com', receives_sms: true, receives_email: true }) as never)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.contact.receives_sms).toBe(false)
    expect(body.contact.receives_email).toBe(false)
  })

  it('rejects a contact with neither phone nor email', async () => {
    const res = await POST(req('POST', { name: 'No channel' }) as never)
    expect(res.status).toBe(400)
  })
})
