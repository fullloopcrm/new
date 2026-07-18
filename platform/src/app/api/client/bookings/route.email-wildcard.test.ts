/**
 * GET /api/client/bookings collected "duplicate" client rows via
 * `.ilike('email', clientRecord.email.trim())` -- an EXACT-MATCH,
 * case-insensitive lookup with zero escaping. clients.email isn't
 * guaranteed clean: unvalidated insert paths (e.g. the inbound-email
 * intake fixed alongside this route) can store a raw sender address
 * verbatim, and `%` is a legal literal in an email local-part. A
 * `%`-containing email already sitting on the requesting client's OWN row
 * would wildcard-match every OTHER client in the tenant, merging an
 * unrelated client's booking history into this client's own portal view.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.PORTAL_SECRET ||= 'test-portal-secret'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

let currentTenantId: string
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => (currentTenantId ? { id: currentTenantId } : null),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const SELF_ID = 'client-self'
const VICTIM_ID = 'client-victim'

function req(clientId: string) {
  return new Request(`http://x/api/client/bookings?client_id=${clientId}`)
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT
  fake._seed('bookings', [
    { id: 'b-victim', tenant_id: TENANT, client_id: VICTIM_ID, start_time: '2030-01-01T00:00:00', status: 'scheduled' },
  ])
})

describe('GET /api/client/bookings — email dedupe ilike is escapeLikeValue-sourced', () => {
  it('does NOT pull in an unrelated client\'s bookings via a wildcard-containing own email', async () => {
    fake._seed('clients', [
      { id: SELF_ID, tenant_id: TENANT, email: '%', phone: null, do_not_service: false },
      { id: VICTIM_ID, tenant_id: TENANT, email: 'victim@example.com', phone: null, do_not_service: false },
    ])
    cookieJar = new Map([['client_session', { value: createClientSession(SELF_ID, TENANT) }]])

    const res = await GET(req(SELF_ID))
    const body = await res.json()

    expect((body.upcoming as { id: string }[]).some((b) => b.id === 'b-victim')).toBe(false)
  })

  it('CONTROL: a real shared email still pulls in the duplicate-import booking', async () => {
    fake._seed('clients', [
      { id: SELF_ID, tenant_id: TENANT, email: 'victim@example.com', phone: null, do_not_service: false },
      { id: VICTIM_ID, tenant_id: TENANT, email: 'victim@example.com', phone: null, do_not_service: false },
    ])
    cookieJar = new Map([['client_session', { value: createClientSession(SELF_ID, TENANT) }]])

    const res = await GET(req(SELF_ID))
    const body = await res.json()

    expect((body.upcoming as { id: string }[]).some((b) => b.id === 'b-victim')).toBe(true)
  })
})
