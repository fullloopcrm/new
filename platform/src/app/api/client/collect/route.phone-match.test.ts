/**
 * COLLECT-FORM CROSS-CLIENT CORRUPTION — the existing-client lookup matched
 * on `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. "5") produced the pattern `%5%`, which
 * matches almost ANY stored phone number as a substring — the route then
 * WROTE the submitter's name/email/address/notes/status onto that unrelated
 * client's row. Same bug class already fixed in client/check + (elsewhere)
 * portal/collect. This suite proves a short phone can no longer resolve to
 * an unrelated client, while a real matching phone (10 digits, or 11 with a
 * leading US '1') still correctly updates the same client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenant: { id: string; name: string; primary_color?: string | null; logo_url?: string | null }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => currentTenant,
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => ({}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => ({}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 'x', html: 'x' }) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-1'
const UNRELATED_ID = 'unrelated-client'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenant = { id: TENANT_ID, name: 'Test Tenant' }
  fake._seed('clients', [
    { id: UNRELATED_ID, tenant_id: TENANT_ID, name: 'Existing Unrelated Client', phone: '5551234567', email: 'existing@x.com', status: 'active' },
  ])
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/client/collect', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/client/collect — phone match must be exact', () => {
  it('a short malformed phone does NOT match and corrupt an unrelated existing client', async () => {
    const res = await POST(postReq({ name: 'Attacker Submission', phone: '5' }))
    expect(res.status).toBe(200)
    const unrelated = fake._all('clients').find((c) => c.id === UNRELATED_ID)!
    expect(unrelated.name).toBe('Existing Unrelated Client')
    expect(unrelated.email).toBe('existing@x.com')

    const created = fake._all('clients').find((c) => c.name === 'Attacker Submission')
    expect(created).toBeTruthy()
    expect(created!.id).not.toBe(UNRELATED_ID)
  })

  it('a full exact phone match still correctly updates the same client', async () => {
    const res = await POST(postReq({ name: 'Updated Name', phone: '5551234567', email: 'new@x.com' }))
    expect(res.status).toBe(200)
    const updated = fake._all('clients').find((c) => c.id === UNRELATED_ID)!
    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe('new@x.com')
  })

  it('a leading-US-1-normalized phone still matches the same client', async () => {
    const res = await POST(postReq({ name: 'Country Code Match', phone: '+1 (555) 123-4567' }))
    expect(res.status).toBe(200)
    const updated = fake._all('clients').find((c) => c.id === UNRELATED_ID)!
    expect(updated.name).toBe('Country Code Match')
  })
})
