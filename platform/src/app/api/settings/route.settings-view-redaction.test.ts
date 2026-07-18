import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/settings previously returned the full `tenants` row (via
 * getTenantForRequest()) with zero permission check — any authenticated
 * team member, including `staff` (which explicitly lacks settings.view
 * per rbac.ts/rbac.test.ts), could call it directly and receive vendor
 * secrets (stripe_api_key, telnyx_api_key, resend_api_key, imap_pass,
 * anthropic_api_key, indexnow_key — plaintext if SECRET_ENCRYPTION_KEY
 * isn't set) plus owner PII and billing fields (owner_email, owner_phone,
 * monthly_rate, setup_fee, admin_notes). This route is also used by
 * unrelated dashboard panels (calendar, quotes, sms, websites, selena)
 * for non-sensitive prefill data, so the fix redacts sensitive fields for
 * roles without settings.view instead of gating the whole route.
 *
 * Follow-up (this pass): the original fix gated on `settings.view`, but
 * `manager` also holds `settings.view` (per rbac.ts) while lacking
 * `settings.edit` entirely -- a manager-tier team member could still pull
 * the tenant's live vendor API keys and owner PII/billing rate read-only
 * via this endpoint (and see them rendered in plaintext inputs on the
 * dashboard Settings > Integrations tab), despite having no ability to
 * ever set/rotate them. The gate now checks `settings.edit` (owner/admin,
 * the only roles that can actually write these fields) instead.
 */

const TENANT_ROW = {
  id: 'tenant-1',
  name: 'Acme Cleaning',
  business_hours: '{"mon":"9-5"}',
  telnyx_phone: '+15551234567',
  selena_config: { tax_rate: 8.5 },
  stripe_api_key: 'v1:iv:ct:tag',
  telnyx_api_key: 'sk_live_secret',
  resend_api_key: 're_secret',
  imap_pass: 'plaintext-imap-password',
  imap_host: 'imap.example.com',
  imap_user: 'bot@example.com',
  anthropic_api_key: 'sk-ant-secret',
  indexnow_key: 'indexnow-secret',
  admin_notes: 'Internal note about this tenant',
  monthly_rate: 499,
  setup_fee: 999,
  owner_email: 'owner@example.com',
  owner_phone: '+15559998888',
  owner_name: 'Jane Owner',
}

let mockRole = 'staff'

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({
    userId: 'user-1',
    tenantId: 'tenant-1',
    tenant: TENANT_ROW,
    role: mockRole,
  })),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

const SENSITIVE_KEYS = [
  'stripe_api_key', 'telnyx_api_key', 'resend_api_key', 'imap_pass',
  'imap_host', 'imap_user', 'anthropic_api_key', 'indexnow_key',
  'admin_notes', 'monthly_rate', 'setup_fee',
  'owner_email', 'owner_phone', 'owner_name',
]

describe('GET /api/settings — settings.edit redaction', () => {
  it('strips secrets/PII/billing fields for a role without settings.view (staff)', async () => {
    mockRole = 'staff'
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    for (const key of SENSITIVE_KEYS) {
      expect(body.tenant[key]).toBeUndefined()
    }
    // Non-sensitive fields other dashboard panels rely on still come through.
    expect(body.tenant.business_hours).toBe(TENANT_ROW.business_hours)
    expect(body.tenant.telnyx_phone).toBe(TENANT_ROW.telnyx_phone)
    expect(body.tenant.selena_config).toEqual(TENANT_ROW.selena_config)
  })

  it('strips secrets/PII/billing fields for manager (has settings.view but not settings.edit)', async () => {
    mockRole = 'manager'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    for (const key of SENSITIVE_KEYS) {
      expect(body.tenant[key]).toBeUndefined()
    }
    expect(body.tenant.business_hours).toBe(TENANT_ROW.business_hours)
  })

  it('returns the full row for a role with settings.edit (admin)', async () => {
    mockRole = 'admin'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    for (const key of SENSITIVE_KEYS) {
      expect(body.tenant[key]).toBe((TENANT_ROW as Record<string, unknown>)[key])
    }
  })

  it('returns the full row for owner', async () => {
    mockRole = 'owner'
    vi.resetModules()
    const { GET } = await import('./route')
    const res = await GET()
    const body = await res.json()

    for (const key of SENSITIVE_KEYS) {
      expect(body.tenant[key]).toBe((TENANT_ROW as Record<string, unknown>)[key])
    }
  })
})
