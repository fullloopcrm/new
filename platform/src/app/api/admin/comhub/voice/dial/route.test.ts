import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * body.admin_phone is a free-text number the browser sends with no
 * server-side check that it belongs to a tenant member. Unlike comhub/send's
 * SMS/email branches, this places a real, per-minute-billed outbound PSTN
 * call via the tenant's own Telnyx account to whatever number is supplied.
 * Without a rate limit, a compromised/rogue admin session can toll-fraud the
 * tenant's Telnyx bill by dialing arbitrary numbers with no throttle.
 */

const { rateLimitAllowed } = vi.hoisted(() => ({ rateLimitAllowed: { value: true } }))

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

const rateLimitDbSpy = vi.fn(async (_key: string, _max: number, _windowMs: number) => ({
  allowed: rateLimitAllowed.value,
  remaining: rateLimitAllowed.value ? 1 : 0,
}))
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: (key: string, max: number, windowMs: number) => rateLimitDbSpy(key, max, windowMs),
}))

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'comhub_contacts') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { phone: '+15551234567' } }),
            }),
          }),
        }),
      }
    }
    if (table === 'comhub_threads') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null }),
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
    if (table === 'comhub_messages') {
      return { insert: async () => ({ error: null }) }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return {
    supabaseAdmin: {
      from,
      rpc: async (fn: string) => {
        if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
        if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
        throw new Error(`unexpected rpc ${fn}`)
      },
    },
  }
})

import { POST } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/voice/dial', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST admin/comhub/voice/dial', () => {
  beforeEach(() => {
    rateLimitAllowed.value = true
    rateLimitDbSpy.mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: { call_control_id: 'call-1' } }), { status: 200 })),
    )
  })

  it('429s once the per-tenant dial rate limit is exhausted, and never calls Telnyx', async () => {
    rateLimitAllowed.value = false

    const res = await POST(makeRequest({ contact_id: 'contact-1', admin_phone: '+15550001111' }))

    expect(res.status).toBe(429)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('places the call when under the rate limit, bucketed per tenant', async () => {
    const res = await POST(makeRequest({ contact_id: 'contact-1', admin_phone: '+15550001111' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(rateLimitDbSpy).toHaveBeenCalledWith('comhub-voice-dial:tenant-1', expect.any(Number), expect.any(Number))
    expect(fetch).toHaveBeenCalledWith(
      'https://api.telnyx.com/v2/calls',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
