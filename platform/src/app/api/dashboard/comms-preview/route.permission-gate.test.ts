import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * campaigns.send gate probe — GET /api/dashboard/comms-preview?send=.
 * The ?send= branch decrypts the tenant's live Resend API key and delivers a
 * real email to an attacker-chosen address, gated only on tenant membership
 * -- any authenticated tenant member (including staff, who lack
 * campaigns.send per rbac.ts) could trigger an arbitrary send using the
 * tenant's paid mail infra/reputation. The plain preview (no ?send=) stays
 * ungated since it never touches the decrypted secret. Proves the send
 * branch now requires campaigns.send.
 */

let role = 'staff'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    userId: 'u1',
    tenantId: 'tenant-A',
    tenant: { id: 'tenant-A' },
    role,
  }),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._store.set('tenants', [
    { id: 'tenant-A', name: 'Acme', resend_api_key: 'enc:fake', email_from: null, domain: 'acme.com' },
  ])
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: () => 'fake-live-key',
}))

const sendEmailMock = vi.fn(async (_args: unknown) => ({ ok: true }))
vi.mock('@/lib/email', () => ({
  sendEmail: (args: unknown) => sendEmailMock(args),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as previewGET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  sendEmailMock.mockClear()
  role = 'staff'
})

describe('GET /api/dashboard/comms-preview — plain preview stays ungated', () => {
  it('any authenticated tenant member can view the preview', async () => {
    const res = await previewGET(new Request('http://x/api/dashboard/comms-preview'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/dashboard/comms-preview?send= — campaigns.send permission gate', () => {
  it('forbidden for a role without campaigns.send', async () => {
    role = 'staff'
    const res = await previewGET(new Request('http://x/api/dashboard/comms-preview?send=attacker@evil.com'))
    expect(res.status).toBe(403)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('allowed for a role with campaigns.send', async () => {
    role = 'admin'
    const res = await previewGET(new Request('http://x/api/dashboard/comms-preview?send=owner@acme.com'))
    expect(res.status).not.toBe(403)
    expect(sendEmailMock).toHaveBeenCalled()
  })
})
