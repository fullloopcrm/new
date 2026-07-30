import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Route-level tests for the tenant-facing profile API — the surface both
 * the public /onboard/[token] link and the in-dashboard wizard call. Uses
 * the REAL tenant-profile registry (only getTenantProfile's DB call is
 * mocked) so isTenantVisible/PROFILE_FIELD_BY_KEY are exercised for real —
 * that's the actual security boundary being verified: an admin-only field
 * (accountOwner, cancellationReason, …) must never be readable or writable
 * from this endpoint, regardless of auth mode.
 */

const resolveOnboardingTenantIdMock = vi.fn()
vi.mock('@/lib/onboarding-auth', () => ({
  resolveOnboardingTenantId: (...args: unknown[]) => resolveOnboardingTenantIdMock(...args),
}))

const getTenantProfileMock = vi.fn()
vi.mock('@/lib/tenant-profile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant-profile')>()
  return { ...actual, getTenantProfile: (...args: unknown[]) => getTenantProfileMock(...args) }
})

const applyProfileWriteMock = vi.fn()
vi.mock('@/lib/tenant-profile-write', () => ({
  applyProfileWrite: (...args: unknown[]) => applyProfileWriteMock(...args),
}))

const h = vi.hoisted(() => ({ tenant: { onboarding_draft: null } as Record<string, unknown> }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: h.tenant, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}))

import { GET, PUT, POST } from './route'

const fakeProfile = () => ({
  tenantId: 'tenant-A',
  name: 'Acme',
  funnel: 'booking' as const,
  slug: 'acme',
  status: 'active',
  fields: [
    { key: 'businessName', label: 'Business name', section: 'identity', store: 'tenant', col: 'name', tier: 'critical', value: 'Acme', filled: true, read: () => 'Acme' },
    { key: 'accountOwner', label: 'Account owner', section: 'account', store: 'tenant', col: 'account_owner', audience: 'admin', tier: 'optional', value: 'jeff@fullloopcrm.com', filled: true, read: () => 'jeff@fullloopcrm.com' },
  ],
})

beforeEach(() => {
  resolveOnboardingTenantIdMock.mockReset()
  getTenantProfileMock.mockReset()
  applyProfileWriteMock.mockReset()
  h.tenant = { onboarding_draft: null }
})

describe('GET /api/tenant-profile', () => {
  it('401s when the caller has no session and no valid token', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue(null)
    const res = await GET(new Request('http://x/api/tenant-profile'))
    expect(res.status).toBe(401)
  })

  it('never returns an admin-only field (accountOwner) to the tenant-facing surface', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue('tenant-A')
    getTenantProfileMock.mockResolvedValue(fakeProfile())
    const res = await GET(new Request('http://x/api/tenant-profile?token=whatever'))
    const json = await res.json()
    const keys = json.fields.map((f: { key: string }) => f.key)
    expect(keys).toContain('businessName')
    expect(keys).not.toContain('accountOwner')
    expect(JSON.stringify(json)).not.toContain('jeff@fullloopcrm.com')
  })
})

describe('POST /api/tenant-profile', () => {
  it('drops a forged admin-only field (accountOwner) before it ever reaches applyProfileWrite', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue('tenant-A')
    applyProfileWriteMock.mockResolvedValue({ saved: true, ignored: [] })

    await POST(new Request('http://x/api/tenant-profile', {
      method: 'POST',
      body: JSON.stringify({ token: 'whatever', data: { businessName: 'New Name', accountOwner: 'attacker@evil.example' } }),
    }))

    expect(applyProfileWriteMock).toHaveBeenCalledTimes(1)
    const written = applyProfileWriteMock.mock.calls[0][1]
    expect(written).toEqual({ businessName: 'New Name' })
    expect(written.accountOwner).toBeUndefined()
  })

  it('401s a write attempt with no valid session/token', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue(null)
    const res = await POST(new Request('http://x/api/tenant-profile', {
      method: 'POST',
      body: JSON.stringify({ data: { businessName: 'x' } }),
    }))
    expect(res.status).toBe(401)
    expect(applyProfileWriteMock).not.toHaveBeenCalled()
  })
})

describe('PUT /api/tenant-profile (autosave)', () => {
  it('401s when unauthorized, never persisting a draft for an unverified caller', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue(null)
    const res = await PUT(new Request('http://x/api/tenant-profile', {
      method: 'PUT',
      body: JSON.stringify({ draft: { businessName: 'x' } }),
    }))
    expect(res.status).toBe(401)
  })

  it('persists the raw draft for an authorized caller', async () => {
    resolveOnboardingTenantIdMock.mockResolvedValue('tenant-A')
    const res = await PUT(new Request('http://x/api/tenant-profile', {
      method: 'PUT',
      body: JSON.stringify({ token: 'whatever', draft: { businessName: 'Draft Name' }, step: 2 }),
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).saved).toBe(true)
  })
})
