import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/dashboard/comms-preview?send= — settings.edit gate (broad-hunt:
 * the plain preview is harmless static markup, but ?send=<email> actually
 * delivers a real email via the tenant's Resend key to an arbitrary
 * caller-supplied address with zero permission check — same class as the
 * sibling /api/test-emails test-send tool, already gated on settings.edit.
 * Per rbac.ts 'staff'/'manager' lack settings.edit; 'admin'/'owner' have it.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  sendEmail: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  sendEmail: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { selena_config: null },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

import { GET } from './route'

const getReq = (qs: string) => new Request(`http://x/api/dashboard/comms-preview${qs}`)

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.sendEmail.mockReset()
  h.sendEmail.mockResolvedValue({ id: 'sent' })
  h.store = {
    tenants: [
      { id: 'tenant-A', name: 'Acme', resend_api_key: 'key-A', email_from: 'hello@acme.example.com', domain: 'acme.example.com' },
    ],
  }
})

describe('GET /api/dashboard/comms-preview?send= — settings.edit permission', () => {
  it('rejects a staff member (no settings.edit) with 403 and sends no email', async () => {
    const res = await GET(getReq('?send=attacker@evil.example.com'))

    expect(res.status).toBe(403)
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a manager (settings.view only) with 403', async () => {
    h.role = 'manager'
    const res = await GET(getReq('?send=attacker@evil.example.com'))

    expect(res.status).toBe(403)
    expect(h.sendEmail).not.toHaveBeenCalled()
  })

  it('allows an admin (has settings.edit) to send', async () => {
    h.role = 'admin'
    const res = await GET(getReq('?send=owner@acme.example.com'))

    expect(res.status).toBe(200)
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not gate the plain preview (no ?send=) for a staff member', async () => {
    const res = await GET(getReq(''))

    expect(res.status).toBe(200)
    expect(h.sendEmail).not.toHaveBeenCalled()
  })
})
