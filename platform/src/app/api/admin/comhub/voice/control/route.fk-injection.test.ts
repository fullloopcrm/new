/**
 * POST /api/admin/comhub/voice/control — cross-tenant call_control_id FK
 * injection. The route resolved customer_call_id ownership via a
 * tenant-scoped comhub_active_calls lookup but then discarded the result:
 * a caller-supplied customer_call_id that didn't belong to this tenant still
 * reached telnyxAction() and drove a live Telnyx call (hold/mute/hangup/
 * transfer/speak/dtmf). Tenants without their own Telnyx account share the
 * platform fallback API key, so this let a caller act on another tenant's
 * live call by supplying its call_control_id.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  tenantId: 'tenant-A',
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: async () => null }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))
vi.mock('@/lib/comhub-voice-config', () => ({
  resolveTenantVoiceConfig: async () => ({
    apiKey: 'shared-platform-key',
    voiceConnectionId: 'conn-1',
    telephonyCredentialId: 'cred-1',
    credentialConnectionId: 'credconn-1',
    fromNumber: '+18883164019',
  }),
}))

const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }) }))
vi.stubGlobal('fetch', fetchMock)

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.tenantId = TENANT_A
  fetchMock.mockClear()
  h.store = {
    comhub_active_calls: [
      { id: 'call-A1', tenant_id: TENANT_A, customer_call_id: 'call-control-A1', hold: false, muted: false },
      { id: 'call-B1', tenant_id: TENANT_B, customer_call_id: 'call-control-B1', hold: false, muted: false },
    ],
  }
})

describe('POST /api/admin/comhub/voice/control — cross-tenant call FK injection', () => {
  it('rejects a customer_call_id belonging to another tenant, never calls Telnyx', async () => {
    const res = await POST(postReq({ customer_call_id: 'call-control-B1', action: 'hangup' }))

    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a fully unknown/foreign call_control_id, never calls Telnyx', async () => {
    const res = await POST(postReq({ customer_call_id: 'call-control-does-not-exist', action: 'mute' }))

    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an active_call_id belonging to another tenant', async () => {
    const res = await POST(postReq({ active_call_id: 'call-B1', action: 'hold' }))

    expect(res.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a customer_call_id genuinely owned by the caller tenant', async () => {
    const res = await POST(postReq({ customer_call_id: 'call-control-A1', action: 'hold' }))

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const rowA = h.store.comhub_active_calls.find((r) => r.id === 'call-A1')
    expect(rowA?.hold).toBe(true)
  })
})
