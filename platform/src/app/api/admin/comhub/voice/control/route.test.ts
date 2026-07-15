import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: when `customer_call_id` was supplied directly (not via
 * `active_call_id`), the route looked up the row scoped to the caller's own
 * tenant but never gated on whether that lookup actually found anything --
 * it proceeded to fire the Telnyx call-control action regardless. Tenants
 * without their own Telnyx account share the platform's default API key
 * (see comhub-voice-config.ts), so an admin who obtained another tenant's
 * call_control_id (e.g. a value that leaked out-of-band) could hold/mute/
 * hangup/transfer that tenant's live call. Fix: 404 when the tenant-scoped
 * lookup for a directly-supplied customer_call_id finds no row.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: vi.fn(async () => 'tenant-1'),
}))

vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: vi.fn(async () => ({
    apiKey: 'test-api-key',
    voiceConnectionId: 'conn-1',
    telephonyCredentialId: 'cred-1',
    credentialConnectionId: 'ccred-1',
    fromNumber: '+18885550100',
  })),
}))

let activeCallRow: { id: string; customer_call_id: string } | null = null

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'comhub_active_calls') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: activeCallRow }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/voice/control', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST admin/comhub/voice/control', () => {
  beforeEach(() => {
    activeCallRow = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 })),
    )
  })

  it('rejects a customer_call_id that does not belong to the caller tenant and never calls Telnyx', async () => {
    activeCallRow = null // tenant-scoped lookup finds nothing -- call belongs to another tenant

    const res = await POST(makeRequest({ customer_call_id: 'other-tenants-call-id', action: 'hangup' }))

    expect(res.status).toBe(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('allows the action when the customer_call_id belongs to the caller tenant', async () => {
    activeCallRow = { id: 'active-call-row-1', customer_call_id: 'my-tenants-call-id' }

    const res = await POST(makeRequest({ customer_call_id: 'my-tenants-call-id', action: 'mute' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('my-tenants-call-id'),
      expect.anything(),
    )
  })
})
