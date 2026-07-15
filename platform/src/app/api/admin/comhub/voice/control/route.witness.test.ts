import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/comhub/voice/control POST — cross-tenant Telnyx call hijack guard.
 *
 * BUG (fixed here): `customer_call_id` is a caller-supplied Telnyx
 * call_control_id. Tenants without their own Telnyx account share the
 * platform's TELNYX_API_KEY (comhub-voice-config.ts), so call_control_ids
 * for DIFFERENT tenants can exist in the SAME Telnyx account. The old code
 * only used the tenant-scoped `comhub_active_calls` lookup to *optionally*
 * fill `activeCallRowId` for a later DB write — it never gated whether the
 * actual Telnyx action executed. An admin of tenant A supplying tenant B's
 * customer_call_id could hold/mute/hangup/transfer/speak-into/DTMF tenant
 * B's live customer call using the shared platform API key, with no
 * ownership check at all.
 *
 * FIX: `customerCallId` is now only ever taken from a `comhub_active_calls`
 * row that already matched `.eq('tenant_id', tenantId)` — a miss 404s
 * before any Telnyx action fires (fetch is never called).
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))
vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: vi.fn(async () => ({
    apiKey: 'test-telnyx-key',
    voiceConnectionId: 'conn-1',
    telephonyCredentialId: 'cred-1',
    credentialConnectionId: 'ccred-1',
    fromNumber: '+18885551234',
  })),
}))

import { POST } from './route'

function seed() {
  return {
    comhub_active_calls: [
      { id: 'call-row-a', tenant_id: TENANT_A, customer_call_id: 'ccid-a-live', status: 'active' },
      { id: 'call-row-b', tenant_id: TENANT_B, customer_call_id: 'ccid-b-live', status: 'active' },
    ],
  }
}

let h: Harness
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: {} }),
    text: async () => '',
  }))
  vi.stubGlobal('fetch', fetchMock)
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/voice/control', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/voice/control POST — cross-tenant call-control guard', () => {
  it('BLOCKED: foreign-tenant customer_call_id 404s, no Telnyx action fires', async () => {
    const res = await POST(req({ customer_call_id: 'ccid-b-live', action: 'mute' }))
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('BLOCKED: foreign-tenant active_call_id 404s, no Telnyx action fires', async () => {
    const res = await POST(req({ active_call_id: 'call-row-b', action: 'hold' }))
    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CONTROL: caller-tenant customer_call_id succeeds and fires the Telnyx action', async () => {
    const res = await POST(req({ customer_call_id: 'ccid-a-live', action: 'mute' }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('https://api.telnyx.com/v2/calls/ccid-a-live/actions/mute')
  })

  it('CONTROL: caller-tenant active_call_id resolves and succeeds', async () => {
    const res = await POST(req({ active_call_id: 'call-row-a', action: 'hold' }))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
