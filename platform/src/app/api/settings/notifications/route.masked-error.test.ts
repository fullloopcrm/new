import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/settings/notifications — comms preferences + capabilities.
 *
 * BUG (fixed here): the tenant-row lookup used `.single()` with the `error`
 * field discarded (only `data` was destructured). A genuine DB failure
 * surfaces identically to "0 rows" once destructured this way, so an actual
 * outage read as `data: undefined` and the route silently returned
 * defaultCommPrefs()-shaped preferences with zero capabilities — an outage
 * looked exactly like "this tenant just hasn't configured comms yet" instead
 * of a loud 500. Fixed with maybeSingle() + an explicit error check (mirrors
 * the pattern already applied throughout tenant.ts / tenant-lookup.ts /
 * tenant-query.ts / tenant-site.ts).
 */

const TENANT_ID = 'tenant-a'

type Resolution = { data: unknown; error: unknown }
let resolveTenantRead: () => Resolution

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => (table === 'tenants' ? resolveTenantRead() : { data: null, error: null }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({ clearSettingsCache: vi.fn() }))

import { GET } from './route'

beforeEach(() => {
  resolveTenantRead = () => ({ data: null, error: null })
})

describe('GET /api/settings/notifications — masked-error probe', () => {
  it('MASKED-ERROR PROBE: a genuine DB failure on the tenant-row read fails loud (500), not silently treated as "no preferences set"', async () => {
    resolveTenantRead = () => ({ data: null, error: { message: 'read replica unreachable' } })

    await expect(GET()).rejects.toThrow(/TENANT_NOTIFICATION_PREFS_LOOKUP_ERROR/)
  })

  it('a genuinely unconfigured tenant (0 rows is impossible here, but no error) still returns default preferences, not a false positive from the fix', async () => {
    resolveTenantRead = () => ({ data: null, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.preferences).toBeTruthy()
  })

  it('a real tenant row with saved preferences returns them normally', async () => {
    resolveTenantRead = () => ({
      data: { notification_preferences: { comms: { booking_received: { email: false } } }, resend_api_key: 'k', telnyx_api_key: null, telnyx_phone: null },
      error: null,
    })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.preferences.comms.booking_received.email).toBe(false)
    expect(json.capabilities.email).toBe(true)
  })
})
