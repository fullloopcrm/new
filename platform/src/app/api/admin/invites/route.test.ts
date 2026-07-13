import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/invites — first route-level regression test (P1/W1 O13
 * sweep). Creates + emails a tenant_invites row with a random token; zero
 * prior coverage of the existing-pending-invite guard, the role-fallback
 * chain (explicit role -> tenant settings default -> 'owner'), the
 * email-failure-doesn't-block-invite-creation behavior, or that the
 * pending-invite check is itself tenant-scoped.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
  sendEmail: vi.fn(),
  getSettings: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  sendEmail: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getSettings: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/email', () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }))
vi.mock('@/lib/settings', () => ({ getSettings: (...a: unknown[]) => h.getSettings(...a) }))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.sendEmail.mockReset()
  h.sendEmail.mockResolvedValue({ ok: true })
  h.getSettings.mockReset()
  h.getSettings.mockResolvedValue({})
  h.store = {
    tenants: [{ id: 'tenant-A', name: 'Acme Cleaning' }],
    tenant_invites: [],
    security_events: [],
    notifications: [],
  }
})

describe('POST /api/admin/invites — permission gate', () => {
  it('returns the admin-gate error unchanged and never touches the DB', async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com' }))

    expect(res.status).toBe(403)
    expect(h.store.tenant_invites.length).toBe(0)
  })
})

describe('POST /api/admin/invites — request validation', () => {
  it('rejects a missing tenant_id or email with 400', async () => {
    const res = await POST(postReq({ email: 'new@x.com' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'tenant_id and email required' })
  })

  it('returns 404 when the tenant does not exist', async () => {
    const res = await POST(postReq({ tenant_id: 'does-not-exist', email: 'new@x.com' }))

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: 'Tenant not found' })
  })
})

describe('POST /api/admin/invites — existing invite guard', () => {
  it('rejects when an active, unexpired, unaccepted invite already exists for the email', async () => {
    h.store.tenant_invites.push({
      id: 'inv-old',
      tenant_id: 'tenant-A',
      email: 'existing@x.com',
      accepted: false,
      expires_at: '2099-01-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'existing@x.com' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'An active invite already exists for this email' })
    expect(h.store.tenant_invites.length).toBe(1)
  })

  it('allows a new invite once the prior one has expired', async () => {
    h.store.tenant_invites.push({
      id: 'inv-old',
      tenant_id: 'tenant-A',
      email: 'existing@x.com',
      accepted: false,
      expires_at: '2020-01-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'existing@x.com' }))

    expect(res.status).toBe(200)
  })

  it("an active invite for another tenant's identical email never blocks this tenant's invite", async () => {
    h.store.tenant_invites.push({
      id: 'inv-B',
      tenant_id: 'tenant-B',
      email: 'shared@x.com',
      accepted: false,
      expires_at: '2099-01-01T00:00:00.000Z',
    })

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'shared@x.com' }))

    expect(res.status).toBe(200)
  })
})

describe('POST /api/admin/invites — creation', () => {
  it('creates an invite with a random hex token, 7-day expiry, and the caller-supplied role', async () => {
    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'New@X.com', role: 'manager' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invite.email).toBe('new@x.com')
    expect(json.invite.role).toBe('manager')
    expect(json.invite.token).toMatch(/^[0-9a-f]{64}$/)

    const created = h.store.tenant_invites[0]
    expect(created.tenant_id).toBe('tenant-A')
    const expiresInMs = new Date(created.expires_at as string).getTime() - Date.now()
    expect(expiresInMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000)
    expect(expiresInMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000)
  })

  it("falls back to the tenant's default_invite_role when no role is supplied", async () => {
    h.getSettings.mockResolvedValueOnce({ default_invite_role: 'dispatcher' })

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com' }))
    const json = await res.json()

    expect(json.invite.role).toBe('dispatcher')
  })

  it("falls back to 'owner' when no role is supplied and settings has no default", async () => {
    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com' }))
    const json = await res.json()

    expect(json.invite.role).toBe('owner')
  })

  it("falls back to 'owner' when no role is supplied and getSettings throws", async () => {
    h.getSettings.mockRejectedValueOnce(new Error('settings unavailable'))

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com' }))
    const json = await res.json()

    expect(json.invite.role).toBe('owner')
  })

  it('sends an invite email containing the tenant name and a join link with the token', async () => {
    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com', role: 'owner' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(h.sendEmail).toHaveBeenCalledTimes(1)
    const emailArgs = h.sendEmail.mock.calls[0][0] as { to: string; subject: string; html: string }
    expect(emailArgs.to).toBe('new@x.com')
    expect(emailArgs.subject).toContain('Acme Cleaning')
    expect(emailArgs.html).toContain(`/join/${json.invite.token}`)
  })

  it('still creates the invite and logs a security event when sending the email fails', async () => {
    h.sendEmail.mockRejectedValueOnce(new Error('resend down'))

    const res = await POST(postReq({ tenant_id: 'tenant-A', email: 'new@x.com', role: 'owner' }))

    expect(res.status).toBe(200)
    expect(h.store.tenant_invites.length).toBe(1)
    expect(h.store.security_events.some((e) => e.tenant_id === 'tenant-A' && e.type === 'member_added')).toBe(true)
  })
})
