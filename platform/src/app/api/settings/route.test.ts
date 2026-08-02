import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/PUT /api/settings — permission gate (regression, 2026-08-01).
 *
 * Live bug found while sweeping previously-uncovered top-level routes: GET
 * had no permission check at all (only getTenantForRequest()), returning the
 * full tenant row -- business config, integration on/off flags, and the
 * encrypted-at-rest vendor-secret ciphertext -- to any authenticated tenant
 * member. 'staff' lacks settings.view by DEFAULT in src/lib/rbac.ts (no
 * tenant override needed), so this was a real, live gap, not a hypothetical
 * one. Fixed to gate GET on settings.view, matching PUT's existing
 * settings.edit gate.
 */

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))
vi.mock('@/lib/security', () => ({ logSecurityEvent: vi.fn() }))
vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn() }))
vi.mock('@/lib/secret-crypto', () => ({ encryptTenantSecrets: (b: unknown) => b }))

import { GET } from './route'

const FAKE_TENANT = { id: 'tenant-A', name: 'Acme', anthropic_api_key: 'enc:ciphertext-blob' }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({
    tenant: { tenantId: 'tenant-A', tenant: FAKE_TENANT },
    error: null,
  })
})

describe('GET /api/settings — permission gate', () => {
  it('calls requirePermission with settings.view, not some other permission', async () => {
    await GET()

    expect(h.requirePermission).toHaveBeenCalledWith('settings.view')
  })

  it('returns the tenant row when the caller has settings.view', async () => {
    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tenant).toEqual(FAKE_TENANT)
  })

  it('denies the request with the requirePermission error when the caller lacks settings.view (e.g. staff, the real default)', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden: insufficient permissions' }), { status: 403 }),
    })

    const res = await GET()

    expect(res.status).toBe(403)
  })
})
